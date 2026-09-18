//
//  RNPdfViewer.m
//  ReadPanda
//
//  Created by Venkataramaaditya Nimmagadda on 15/03/26.
//

#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE (RNPdfViewer, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(pdfDetails, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(initialPage, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(onPageChanged, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onLoadComplete, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onError, RCTDirectEventBlock)

// Comments (6a): threads to draw, and the three events the reader raises.
RCT_EXPORT_VIEW_PROPERTY(comments, NSArray)
RCT_EXPORT_VIEW_PROPERTY(clearSelectionToken, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(scrollToAnchorKey, NSString)
RCT_EXPORT_VIEW_PROPERTY(onCommentRequested, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onThreadOpen, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onSelectionChanged, RCTDirectEventBlock)

@end
