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

#import "MmkvPlatformContext.h"
#import "MmkvHostObject.h"
#import "MmkvLogger.h"
#import "MMKVManagedBuffer.h"
#import "NativeMmkvModule.h"
#import "AESCrypt.h"
#import "openssl_aes.h"
#import "openssl_aes_locl.h"
#import "openssl_arm_arch.h"
#import "openssl_md32_common.h"
#import "openssl_md5.h"
#import "openssl_md5_locl.h"
#import "openssl_opensslconf.h"
#import "CodedInputData.h"
#import "CodedInputDataCrypt.h"
#import "CodedOutputData.h"
#import "Checksum.h"
#import "crc32.h"
#import "zconf.h"
#import "zutil.h"
#import "InterProcessLock.h"
#import "KeyValueHolder.h"
#import "MemoryFile.h"
#import "MiniPBCoder.h"
#import "MMBuffer.h"
#import "MMKV.h"
#import "MMKVLog.h"
#import "MMKVMetaInfo.hpp"
#import "MMKVPredef.h"
#import "MMKV_IO.h"
#import "MMKV_OSX.h"
#import "PBEncodeItem.hpp"
#import "PBUtility.h"
#import "ScopedLock.hpp"
#import "ThreadLock.h"

FOUNDATION_EXPORT double react_native_mmkvVersionNumber;
FOUNDATION_EXPORT const unsigned char react_native_mmkvVersionString[];

