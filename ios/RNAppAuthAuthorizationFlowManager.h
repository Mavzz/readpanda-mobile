//
//  RNAppAuthAuthorizationFlowManager.h
//  ReadPanda
//
//  Created by Venkataramaaditya Nimmagadda on 27/10/25.
//

#import <Foundation/Foundation.h>

@protocol RNAppAuthAuthorizationFlowManagerDelegate
- (BOOL)resumeExternalUserAgentFlowWithURL:(NSURL *)url;
@end

@protocol RNAppAuthAuthorizationFlowManager <NSObject>
@property(nonatomic, weak, nullable) id<RNAppAuthAuthorizationFlowManagerDelegate> authorizationFlowManagerDelegate;
@end
