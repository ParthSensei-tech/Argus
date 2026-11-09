import io
import shutil
import uuid

from PIL import Image

from app.core.config import get_settings
from app.schemas.contracts import CanonicalContent, ContentBlock, ImageRef, SourceLocation
from app.services.storage import LocalStorage, StorageError, SupabaseStorage

settings = get_settings()
TESSERACT_AVAILABLE = shutil.which("tesseract") is not None
MAX_EMBEDDED_IMAGES = 20


def _ocr_image(data: bytes) -> tuple[str, list[str]]:
    if not TESSERACT_AVAILABLE:
        return "", ["OCR unavailable: tesseract binary not installed; image text not extracted"]
    try:
        import pytesseract

        img = Image.open(io.BytesIO(data))
        return pytesseract.image_to_string(img).strip(), []
    except Exception as exc:
        return "", [f"OCR failed: {exc}"]


def _text_blocks(text: str) -> list[ContentBlock]:
    blocks = []
    offset = 0
    for i, para in enumerate(p for p in text.split("\n\n") if p.strip()):
        start = text.find(para, offset)
        blocks.append(
            ContentBlock(
                block_id=f"p{i}",
                text=para.strip(),
                location=SourceLocation(paragraph=i, char_start=start, char_end=start + len(para)),
            )
        )
        offset = start + len(para)
    return blocks


def _extract_pdf(data: bytes, org_id: str, storage) -> CanonicalContent:
    import fitz

    warnings: list[str] = []
    blocks: list[ContentBlock] = []
    images: list[ImageRef] = []
    doc = fitz.open(stream=data, filetype="pdf")
    page_count = len(doc)
    limit = settings.MAX_DOCUMENT_PAGES
    if page_count > limit:
        warnings.append(f"Document has {page_count} pages; only first {limit} analysed (MAX_DOCUMENT_PAGES)")
    for page_idx in range(min(page_count, limit)):
        page = doc[page_idx]
        page_text = page.get_text("text").strip()
        if page_text:
            for bi, block in enumerate(page.get_text("blocks")):
                text = str(block[4]).strip()
                if text:
                    blocks.append(
                        ContentBlock(
                            block_id=f"p{page_idx}b{bi}",
                            text=text,
                            location=SourceLocation(page=page_idx + 1, section=f"block {bi}"),
                        )
                    )
        else:
            ocr_text, ocr_warnings = _ocr_image(page.get_pixmap(dpi=150).tobytes("png"))
            warnings.extend(ocr_warnings)
            if ocr_text:
                blocks.append(
                    ContentBlock(
                        block_id=f"p{page_idx}ocr",
                        kind="ocr_text",
                        text=ocr_text,
                        location=SourceLocation(page=page_idx + 1),
                    )
                )
            else:
                warnings.append(f"Page {page_idx + 1}: no extractable text (scanned page without OCR result)")
        for img_idx, img_info in enumerate(page.get_images(full=True)):
            if len(images) >= MAX_EMBEDDED_IMAGES:
                warnings.append(f"Embedded image cap ({MAX_EMBEDDED_IMAGES}) reached; remaining images skipped")
                break
            try:
                extracted = doc.extract_image(img_info[0])
                mime = f"image/{extracted['ext']}"
                key = storage.put(org_id, extracted["image"], f"pdf-p{page_idx + 1}-{img_idx}.{extracted['ext']}")
                images.append(
                    ImageRef(
                        image_id=uuid.uuid4().hex,
                        storage_key=key,
                        mime=mime,
                        location=SourceLocation(page=page_idx + 1),
                        origin="embedded",
                    )
                )
            except Exception as exc:
                warnings.append(f"Page {page_idx + 1} image {img_idx}: extraction failed ({exc})")
    metadata = {"page_count": page_count, "analysed_pages": min(page_count, limit)}
    doc.close()
    status = "COMPLETE" if not warnings else "PARTIAL"
    return CanonicalContent(
        input_type="DOCUMENT",
        blocks=blocks,
        images=images,
        full_text="\n\n".join(b.text for b in blocks),
        metadata=metadata,
        warnings=warnings,
        extraction_status=status,
        confidence=0.95 if status == "COMPLETE" else 0.7,
    )


def _extract_docx(data: bytes, org_id: str, storage) -> CanonicalContent:
    from docx import Document

    doc = Document(io.BytesIO(data))
    blocks: list[ContentBlock] = []
    images: list[ImageRef] = []
    warnings: list[str] = []
    for i, para in enumerate(doc.paragraphs):
        text = para.text.strip()
        if text:
            kind = "heading" if para.style.name.lower().startswith("heading") else "paragraph"
            blocks.append(
                ContentBlock(
                    block_id=f"p{i}",
                    kind=kind,
                    text=text,
                    location=SourceLocation(paragraph=i, section=para.style.name if kind == "heading" else None),
                )
            )
    for ti, table in enumerate(doc.tables):
        rows = [" | ".join(cell.text.strip() for cell in row.cells) for row in table.rows]
        blocks.append(
            ContentBlock(
                block_id=f"t{ti}", kind="table", text="\n".join(rows), location=SourceLocation(section=f"table {ti}")
            )
        )
    for part in doc.part.related_parts.values():
        if getattr(part, "content_type", "").startswith("image/"):
            if len(images) >= MAX_EMBEDDED_IMAGES:
                warnings.append(f"Embedded image cap ({MAX_EMBEDDED_IMAGES}) reached")
                break
            ext = part.content_type.split("/")[-1].replace("jpeg", "jpg")
            key = storage.put(org_id, part.blob, f"docx-img-{len(images)}.{ext}")
            images.append(
                ImageRef(image_id=uuid.uuid4().hex, storage_key=key, mime=part.content_type, origin="embedded")
            )
    return CanonicalContent(
        input_type="DOCUMENT",
        blocks=blocks,
        images=images,
        full_text="\n\n".join(b.text for b in blocks),
        metadata={"paragraphs": len(doc.paragraphs), "tables": len(doc.tables)},
        warnings=warnings,
        extraction_status="COMPLETE" if not warnings else "PARTIAL",
        confidence=0.95,
    )


def _extract_pptx(data: bytes, org_id: str, storage) -> CanonicalContent:
    from pptx import Presentation
    from pptx.enum.shapes import MSO_SHAPE_TYPE

    prs = Presentation(io.BytesIO(data))
    blocks: list[ContentBlock] = []
    images: list[ImageRef] = []
    warnings: list[str] = []
    slide_count = len(prs.slides)
    limit = settings.MAX_DOCUMENT_PAGES
    if slide_count > limit:
        warnings.append(f"Presentation has {slide_count} slides; only first {limit} analysed")
    for si, slide in enumerate(prs.slides):
        if si >= limit:
            break
        texts = []
        for shape in slide.shapes:
            if shape.has_text_frame and shape.text_frame.text.strip():
                texts.append(shape.text_frame.text.strip())
            if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
                if len(images) >= MAX_EMBEDDED_IMAGES:
                    warnings.append(f"Embedded image cap ({MAX_EMBEDDED_IMAGES}) reached")
                    continue
                try:
                    img = shape.image
                    key = storage.put(org_id, img.blob, f"slide{si + 1}-img.{img.ext}")
                    images.append(
                        ImageRef(
                            image_id=uuid.uuid4().hex,
                            storage_key=key,
                            mime=f"image/{img.ext}",
                            location=SourceLocation(slide=si + 1),
                            origin="embedded",
                        )
                    )
                except Exception as exc:
                    warnings.append(f"Slide {si + 1}: image extraction failed ({exc})")
        if texts:
            blocks.append(
                ContentBlock(
                    block_id=f"s{si}",
                    kind="slide_text",
                    text="\n".join(texts),
                    location=SourceLocation(slide=si + 1),
                )
            )
    return CanonicalContent(
        input_type="DOCUMENT",
        blocks=blocks,
        images=images,
        full_text="\n\n".join(b.text for b in blocks),
        metadata={"slide_count": slide_count},
        warnings=warnings,
        extraction_status="COMPLETE" if not warnings else "PARTIAL",
        confidence=0.95,
    )


def _extract_image(data: bytes, mime: str, org_id: str, storage, filename: str) -> CanonicalContent:
    warnings: list[str] = []
    img = Image.open(io.BytesIO(data))
    key = storage.put(org_id, data, filename)
    image = ImageRef(
        image_id=uuid.uuid4().hex,
        storage_key=key,
        mime=mime,
        location=SourceLocation(region={"x": 0, "y": 0, "w": img.width, "h": img.height}),
        origin="upload",
    )
    ocr_text, ocr_warnings = _ocr_image(data)
    warnings.extend(ocr_warnings)
    blocks = (
        [ContentBlock(block_id="img0", kind="image_text", text=ocr_text, location=SourceLocation())]
        if ocr_text
        else []
    )
    return CanonicalContent(
        input_type="IMAGE",
        blocks=blocks,
        images=[image],
        full_text=ocr_text,
        metadata={"width": img.width, "height": img.height, "mode": img.mode, "ocr_available": TESSERACT_AVAILABLE},
        warnings=warnings,
        extraction_status="COMPLETE" if not warnings else "PARTIAL",
        confidence=0.9 if ocr_text else 0.6,
    )


def extract_content(
    input_type: str,
    org_id: str,
    storage: LocalStorage | SupabaseStorage,
    raw_text: str = "",
    file_data: bytes | None = None,
    mime: str = "",
    filename: str = "",
) -> CanonicalContent:
    try:
        if input_type == "TEXT":
            blocks = _text_blocks(raw_text)
            return CanonicalContent(
                input_type="TEXT",
                blocks=blocks,
                full_text=raw_text,
                metadata={"characters": len(raw_text)},
                extraction_status="COMPLETE",
            )
        if file_data is None:
            raise StorageError("No file data provided")
        if input_type == "IMAGE":
            return _extract_image(file_data, mime, org_id, storage, filename)
        fn_lower = filename.lower()
        if mime == "application/pdf" or fn_lower.endswith(".pdf"):
            return _extract_pdf(file_data, org_id, storage)
        if mime.endswith("wordprocessingml.document") or fn_lower.endswith(".docx"):
            return _extract_docx(file_data, org_id, storage)
        if mime.endswith("presentationml.presentation") or fn_lower.endswith(".pptx"):
            return _extract_pptx(file_data, org_id, storage)
        if mime in ("text/plain", "text/markdown", "text/x-markdown") or fn_lower.endswith((".txt", ".md", ".markdown")):
            try:
                text = file_data.decode("utf-8")
            except UnicodeDecodeError:
                text = file_data.decode("latin-1", errors="replace")
            result = CanonicalContent(
                input_type="DOCUMENT",
                blocks=_text_blocks(text),
                full_text=text,
                metadata={"characters": len(text), "filename": filename},
                extraction_status="COMPLETE",
            )
            return result
        raise StorageError(f"Unsupported file type: {mime}")
    except StorageError:
        raise
    except Exception as exc:
        return CanonicalContent(
            input_type=input_type,
            full_text=raw_text,
            warnings=[f"Extraction failed: {exc}"],
            extraction_status="FAILED",
            confidence=0.0,
        )