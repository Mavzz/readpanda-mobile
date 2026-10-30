//
//  PageImageScanner.swift
//  ReadPanda
//
//  Where a PDF page draws its images, so Sepia and Night can leave them in
//  their own colours (specs/page-theme R5). Only CoreGraphics, so it can be
//  run against real manuscripts off the device.
//

import CoreGraphics

enum PageImageScanner {
    /// Forms inside forms are followed this deep, no further: a broken file
    /// can point a form at itself.
    private static let maxFormDepth = 8

    /// The page-space boxes the page's images are drawn into, with any that
    /// overlap merged so the boxes don't overlap each other. Images the
    /// scanner can't place (inline images, a stream it can't read) are left
    /// out, so they're themed with the page rather than stopping it (R5.2).
    static func imageAreas(of page: CGPDFPage) -> [CGRect] {
        let state = ScanState()
        let content = CGPDFContentStreamCreateWithPage(page)
        scan(content, state: state)
        return merged(state.areas)
    }

    private final class ScanState {
        var ctm = CGAffineTransform.identity
        var saved: [CGAffineTransform] = []
        var areas: [CGRect] = []
        var formDepth = 0
    }

    private static let operators: CGPDFOperatorTableRef? = {
        guard let table = CGPDFOperatorTableCreate() else {
            return nil
        }
        CGPDFOperatorTableSetCallback(table, "q") { _, info in
            let state = Unmanaged<ScanState>.fromOpaque(info!).takeUnretainedValue()
            state.saved.append(state.ctm)
        }
        CGPDFOperatorTableSetCallback(table, "Q") { _, info in
            let state = Unmanaged<ScanState>.fromOpaque(info!).takeUnretainedValue()
            if let ctm = state.saved.popLast() {
                state.ctm = ctm
            }
        }
        CGPDFOperatorTableSetCallback(table, "cm") { scanner, info in
            let state = Unmanaged<ScanState>.fromOpaque(info!).takeUnretainedValue()
            // Popped last operand first.
            var n: [CGPDFReal] = Array(repeating: 0, count: 6)
            for i in (0..<6).reversed() {
                guard CGPDFScannerPopNumber(scanner, &n[i]) else {
                    return
                }
            }
            let m = CGAffineTransform(a: n[0], b: n[1], c: n[2], d: n[3], tx: n[4], ty: n[5])
            state.ctm = m.concatenating(state.ctm)
        }
        CGPDFOperatorTableSetCallback(table, "Do") { scanner, info in
            let state = Unmanaged<ScanState>.fromOpaque(info!).takeUnretainedValue()
            xObject(scanner, state: state)
        }
        return table
    }()

    private static func scan(_ content: CGPDFContentStreamRef, state: ScanState) {
        guard let table = operators else {
            return
        }
        let info = Unmanaged.passUnretained(state).toOpaque()
        let scanner = CGPDFScannerCreate(content, table, info)
        CGPDFScannerScan(scanner)
        CGPDFScannerRelease(scanner)
    }

    /// `Do`: an image is recorded where the current transform puts the unit
    /// square; a form is scanned in turn, under its own matrix.
    private static func xObject(_ scanner: CGPDFScannerRef, state: ScanState) {
        var namePtr: UnsafePointer<CChar>?
        guard CGPDFScannerPopName(scanner, &namePtr), let name = namePtr else {
            return
        }
        let content = CGPDFScannerGetContentStream(scanner)
        var stream: CGPDFStreamRef?
        guard let object = CGPDFContentStreamGetResource(content, "XObject", name),
            CGPDFObjectGetValue(object, .stream, &stream),
            let stream = stream,
            let dict = CGPDFStreamGetDictionary(stream)
        else {
            return
        }
        var subtypePtr: UnsafePointer<CChar>?
        guard CGPDFDictionaryGetName(dict, "Subtype", &subtypePtr), let subtypeName = subtypePtr else {
            return
        }

        switch String(cString: subtypeName) {
        case "Image":
            let area = CGRect(x: 0, y: 0, width: 1, height: 1).applying(state.ctm)
            if area.width > 0, area.height > 0 {
                state.areas.append(area)
            }
        case "Form":
            guard state.formDepth < maxFormDepth else {
                return
            }
            var resources: CGPDFDictionaryRef?
            guard CGPDFDictionaryGetDictionary(dict, "Resources", &resources), let resources = resources else {
                // A form with no resources of its own can't name an image.
                return
            }
            let outer = state.ctm
            state.ctm = formMatrix(dict).concatenating(outer)
            state.formDepth += 1
            let formContent = CGPDFContentStreamCreateWithStream(stream, resources, content)
            scan(formContent, state: state)
            CGPDFContentStreamRelease(formContent)
            state.formDepth -= 1
            state.ctm = outer
        default:
            return
        }
    }

    private static func formMatrix(_ dict: CGPDFDictionaryRef) -> CGAffineTransform {
        var array: CGPDFArrayRef?
        guard CGPDFDictionaryGetArray(dict, "Matrix", &array), let array = array, CGPDFArrayGetCount(array) == 6 else {
            return .identity
        }
        var n: [CGPDFReal] = Array(repeating: 0, count: 6)
        for i in 0..<6 {
            guard CGPDFArrayGetNumber(array, i, &n[i]) else {
                return .identity
            }
        }
        return CGAffineTransform(a: n[0], b: n[1], c: n[2], d: n[3], tx: n[4], ty: n[5])
    }

    /// Overlapping boxes become one box round both, until none overlap. The
    /// clip that keeps images out of the theme is even-odd, and two boxes
    /// over the same spot would cancel there.
    static func merged(_ areas: [CGRect]) -> [CGRect] {
        var result: [CGRect] = []
        for area in areas {
            var box = area
            var i = 0
            while i < result.count {
                if result[i].intersects(box) {
                    box = box.union(result.remove(at: i))
                    i = 0
                } else {
                    i += 1
                }
            }
            result.append(box)
        }
        return result
    }
}
