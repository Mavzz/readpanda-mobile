//
//  RNPdfViewerManager.m
//  ReadPanda
//
//  Created by Venkataramaaditya Nimmagadda on 18/08/25.
//

#import "RNPdfViewerManager.h"
#import "ReadPanda-Swift.h"

@implementation RNPdfViewerManager
RCT_EXPORT_MODULE(RNPdfViewer)

- (UIView *)view
{
    return [[RNPdfViewer alloc] init]; // Instantiate your Swift UIView
}

// Expose the setPdfUrl method
// The `RCT_CUSTOM_VIEW_PROPERTY` macro automatically maps the JavaScript prop `pdfUrl`
// to the `setPdfUrl` method on your `RNPdfViewer` instance.
RCT_CUSTOM_VIEW_PROPERTY(pdfUrl, NSString, RNPdfViewer) {
    [view setPdfUrl:json];
}

RCT_EXPORT_VIEW_PROPERTY(onPdfLoadStart, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPdfLoadComplete, RCTBubblingEventBlock)

@end
