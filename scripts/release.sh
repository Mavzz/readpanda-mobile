#!/bin/sh
# Builds an Ad Hoc .ipa and sends it to testers through Firebase App
# Distribution, registering any new tester devices with Apple first.
#
#   yarn release
#   yarn release notes:"Fixes the comment sheet on iPad"
#
# Runs only on master, clean and in sync with origin. The lane is in
# fastlane/Fastfile; setup is in docs/RUN.md.
set -e

# macOS ships Ruby 2.6, which current fastlane doesn't run on. CI sets up its
# own Ruby, so only reach for Homebrew's when the one on PATH is too old.
if ! ruby -e 'exit(RUBY_VERSION >= "3")' 2>/dev/null && [ -d /opt/homebrew/opt/ruby/bin ]; then
  PATH="/opt/homebrew/opt/ruby/bin:$PATH"
fi

if [ ! -f fastlane/.env ]; then
  echo "No fastlane/.env. Create it from fastlane/.env.example." >&2
  exit 1
fi

# Gems go in vendor/bundle, not the system Ruby.
bundle config set --local path vendor/bundle >/dev/null
bundle check >/dev/null 2>&1 || bundle install
exec bundle exec fastlane ios release "$@"
