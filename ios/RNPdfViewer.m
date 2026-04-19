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

@end
