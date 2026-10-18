#!/bin/sh
# Builds a Release .ipa against production, with the JavaScript bundled in,
# so it runs on a phone without Metro or this Mac.
#
#   yarn ipa                  development-signed (devices registered to the team)
#   yarn ipa --adhoc          Ad Hoc, e.g. for Firebase App Distribution
#   yarn ipa --install        also install it on the connected iPhone
#   yarn release              Ad Hoc, uploaded to Firebase (fastlane/Fastfile)
#
# Either way it only installs on devices in the team's provisioning profile;
# anyone else needs TestFlight. Output: ios/build/ipa/ReadPanda.ipa.
set -e

method=debugging
install=
for arg in "$@"; do
  case "$arg" in
    --adhoc) method=release-testing ;;
    --install) install=1 ;;
    *) echo "usage: yarn ipa [--adhoc] [--install]" >&2; exit 1 ;;
  esac
done

# The backend URL is compiled in, so pin production before bundling.
sh scripts/use-env.sh prod

cd ios
mkdir -p build
archive=build/ReadPanda.xcarchive
rm -rf "$archive" build/ipa

# yarn release passes the Ad Hoc profiles it just made ("bundle id=profile
# name", one per line), so the export signs with exactly those. Otherwise
# Xcode picks the certificate and profiles itself.
if [ -n "$ADHOC_PROFILES" ]; then
  signing="<key>signingStyle</key><string>manual</string>
  <key>signingCertificate</key><string>Apple Distribution</string>
  <key>provisioningProfiles</key>
  <dict>
$(printf '%s\n' "$ADHOC_PROFILES" | sed 's|^\([^=]*\)=\(.*\)$|    <key>\1</key><string>\2</string>|')
  </dict>"
else
  signing="<key>signingStyle</key><string>automatic</string>"
fi

cat > build/ExportOptions.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>$method</string>
  <key>teamID</key><string>6F6H5A6JCC</string>
  $signing
</dict>
</plist>
EOF

# With an App Store Connect API key (yarn release sets these), xcodebuild
# updates profiles with it instead of the Apple ID signed in to Xcode.
set --
if [ -n "$ASC_KEY_PATH" ]; then
  set -- -authenticationKeyPath "$ASC_KEY_PATH" \
    -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID"
fi

# yarn release passes the next build number. Overriding it here sets the app
# and the widget together (they must match) without touching the project file.
build_number=
if [ -n "$BUILD_NUMBER" ]; then
  build_number="CURRENT_PROJECT_VERSION=$BUILD_NUMBER"
fi

# --reset-cache: Metro's cache could still hold the other environment's values.
echo "Archiving ($method)..."
xcodebuild -workspace ReadPanda.xcworkspace -scheme ReadPanda \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$archive" -allowProvisioningUpdates "$@" \
  EXTRA_PACKAGER_ARGS=--reset-cache $build_number \
  archive -quiet

echo "Exporting..."
xcodebuild -exportArchive -archivePath "$archive" \
  -exportOptionsPlist build/ExportOptions.plist -exportPath build/ipa \
  -allowProvisioningUpdates "$@" -quiet

ipa=build/ipa/ReadPanda.ipa
echo "Built ios/$ipa"

if [ -n "$install" ]; then
  # The first connected iOS device that isn't this Mac.
  udid=$(xcrun xctrace list devices 2>/dev/null |
    sed -n '/== Devices ==/,/== /p' | grep -v -e '==' -e 'Mac' |
    sed -n 's/.*(\([0-9A-F-]\{20,\}\))$/\1/p' | head -1)
  if [ -z "$udid" ]; then
    echo "No iPhone connected; plug one in, or install ios/$ipa from Xcode's Devices window." >&2
    exit 1
  fi
  echo "Installing on $udid..."
  xcrun devicectl device install app --device "$udid" "$ipa"
fi
