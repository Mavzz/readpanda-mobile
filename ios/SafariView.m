//
//  SafariView.m
//  ReadPanda
//
//  Exposes SafariView.swift to JS as NativeModules.SafariView.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (SafariView, NSObject)

// Shows an http(s) page in an in-app Safari view over whatever is on screen.
RCT_EXTERN_METHOD(open : (NSString *)url resolver : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject)

@end
