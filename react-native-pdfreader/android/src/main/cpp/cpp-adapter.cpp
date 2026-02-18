#include <jni.h>
#include "NitroPdfreaderOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::pdfreader::initialize(vm);
}
