#ifdef __OBJC__
#import <UIKit/UIKit.h>
#else
#ifndef FOUNDATION_EXPORT
#if defined(__cplusplus)
#define FOUNDATION_EXPORT extern "C"
#else
#define FOUNDATION_EXPORT extern
#endif
#endif
#endif

#import "PdfManager.h"
#import "RNPDFPdfPageView.h"
#import "RNPDFPdfPageViewManager.h"
#import "RNPDFPdfView.h"
#import "RNPDFPdfViewManager.h"

FOUNDATION_EXPORT double react_native_pdfVersionNumber;
FOUNDATION_EXPORT const unsigned char react_native_pdfVersionString[];

