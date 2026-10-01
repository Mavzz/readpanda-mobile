//
//  WidgetBridge.m
//  ReadPanda
//
//  Exposes WidgetBridge.swift to JS as NativeModules.WidgetBridge.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (WidgetBridge, NSObject)

// Writes the widget's state into the App Group and reloads it.
RCT_EXTERN_METHOD(update : (NSDictionary *)state)

// Sign-out: removes the state and cached covers.
RCT_EXTERN_METHOD(clear)

@end
