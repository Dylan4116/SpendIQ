from statistics import median


def _flatten_point(point):
    """Recursively flatten a nested polygon point into (x, y)."""
    # PaddleOCR 3.x rec_polys returns [[x,y],[x,y]...] so each 'point' is already [x, y]
    if isinstance(point, (list, tuple)) and len(point) == 2:
        if isinstance(point[0], (int, float)):
            return (float(point[0]), float(point[1]))
        # Nested deeper — take the first sub-element
        return _flatten_point(point[0])
    return (float(point), 0.0)


def _bbox(polygon):
    points = [_flatten_point(point) for point in polygon]
    min_x = min(point[0] for point in points)
    min_y = min(point[1] for point in points)
    max_x = max(point[0] for point in points)
    max_y = max(point[1] for point in points)
    return {
        "x": int(round(min_x)),
        "y": int(round(min_y)),
        "width": max(0, int(round(max_x - min_x))),
        "height": max(0, int(round(max_y - min_y))),
    }


def _fragments(raw_result):
    if not raw_result:
        return []
    result = raw_result[0] if len(raw_result) == 1 and isinstance(raw_result[0], list) else raw_result
    fragments = []
    for entry in result or []:
        if not entry or len(entry) < 2:
            continue
        polygon, recognition = entry[0], entry[1]
        if not recognition or len(recognition) < 2:
            continue
        text, confidence = str(recognition[0]).strip(), float(recognition[1])
        if not text:
            continue
        bbox = _bbox(polygon)
        fragments.append({
            "text": text,
            "confidence": max(0.0, min(1.0, confidence)),
            "bbox": bbox,
            "center_y": bbox["y"] + (bbox["height"] / 2),
        })
    return fragments


def normalize_result(raw_result, image_width, image_height, processing_ms):
    fragments = _fragments(raw_result)
    if not fragments:
        return {
            "rawText": "",
            "lines": [],
            "meta": {
                "lineCount": 0,
                "avgConfidence": 0,
                "lowConfidenceLines": 0,
                "imageWidth": image_width,
                "imageHeight": image_height,
                "processingMs": processing_ms,
            },
        }

    median_height = median(max(fragment["bbox"]["height"], 1) for fragment in fragments)
    rows = []
    for fragment in sorted(fragments, key=lambda item: item["center_y"]):
        row = rows[-1] if rows else None
        if row is None or abs(fragment["center_y"] - row["center_y"]) > median_height / 2:
            rows.append({"center_y": fragment["center_y"], "fragments": [fragment]})
        else:
            row["fragments"].append(fragment)
            row["center_y"] = sum(item["center_y"] for item in row["fragments"]) / len(row["fragments"])

    lines = []
    for row in rows:
        row_fragments = sorted(row["fragments"], key=lambda item: item["bbox"]["x"])
        boxes = [item["bbox"] for item in row_fragments]
        left = min(box["x"] for box in boxes)
        top = min(box["y"] for box in boxes)
        right = max(box["x"] + box["width"] for box in boxes)
        bottom = max(box["y"] + box["height"] for box in boxes)
        confidence = round(sum(item["confidence"] for item in row_fragments) / len(row_fragments), 3)
        lines.append({
            "text": " ".join(item["text"] for item in row_fragments),
            "confidence": confidence,
            "bbox": {"x": left, "y": top, "width": right - left, "height": bottom - top},
        })

    lines.sort(key=lambda line: (line["bbox"]["y"], line["bbox"]["x"]))
    avg_confidence = round(sum(line["confidence"] for line in lines) / len(lines), 3)
    return {
        "rawText": "\n".join(line["text"] for line in lines),
        "lines": lines,
        "meta": {
            "lineCount": len(lines),
            "avgConfidence": avg_confidence,
            "lowConfidenceLines": sum(line["confidence"] < 0.6 for line in lines),
            "imageWidth": image_width,
            "imageHeight": image_height,
            "processingMs": processing_ms,
        },
    }
