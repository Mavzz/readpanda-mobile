//
//  RNPdfViewer.m
//  ReadPanda
//
//  Created by Venkataramaaditya Nimmagadda on 15/03/26.
//

#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE (RNPdfViewer, RCTViewManager)

// The document and where in it to open.
RCT_EXPORT_VIEW_PROPERTY(pdfDetails, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(initialPage, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(bookTitle, NSString)
RCT_EXPORT_VIEW_PROPERTY(onPageChanged, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onLoadComplete, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onError, RCTDirectEventBlock)

// Chrome the reader draws itself; navigation still belongs to JS.
RCT_EXPORT_VIEW_PROPERTY(onBack, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onSearch, RCTDirectEventBlock)

// The comment layer (6a/6b). JS owns the store and the API; it pushes threads
// down as data and takes the reader's intent back as events.
RCT_EXPORT_VIEW_PROPERTY(threads, NSArray)
RCT_EXPORT_VIEW_PROPERTY(hasRoom, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(canPickRoom, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(roomName, NSString)
RCT_EXPORT_VIEW_PROPERTY(unreadTotal, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(lockedCount, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(submitting, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(openThreadKey, NSString)
RCT_EXPORT_VIEW_PROPERTY(onThreadOpened, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onSubmitComment, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onLikeComment, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onRetryComment, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onRoomPickerRequested, RCTDirectEventBlock)

// Personal highlights. Private to the reader, so they exist in solo books too.
RCT_EXPORT_VIEW_PROPERTY(highlights, NSArray)
RCT_EXPORT_VIEW_PROPERTY(onCreateHighlight, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onRemoveHighlight, RCTDirectEventBlock)

@end
