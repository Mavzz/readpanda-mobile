# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# react-native-pdf renders through PdfiumAndroid, which is reached via JNI.
-keep class com.shockwave.** { *; }

# Credential Manager loads its Play Services provider reflectively
# (Google sign-in via androidx.credentials + googleid).
-if class androidx.credentials.CredentialManager
-keep class androidx.credentials.playservices.** { *; }
