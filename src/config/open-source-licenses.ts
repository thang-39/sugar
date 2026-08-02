/**
 * Attribution list for the "Giấy phép nguồn mở" screen.
 *
 * Only the libraries that actually ship in the binary are listed — build/CLI-only
 * tooling (metro, eslint, jest…) never reaches the user's device and carries no
 * distribution obligation. Names, versions and licence identifiers are proper
 * nouns, so they live here rather than in i18n; only the screen's title and intro
 * are translated.
 *
 * The real obligations this satisfies: MIT and Apache-2.0 both require the licence
 * text to accompany redistribution, and Apache-2.0 additionally requires NOTICE
 * preservation. SIL OFL 1.1 (Nunito) does not require in-app attribution for an
 * embedded font, but it costs nothing to credit it.
 *
 * When adding a production dependency, add a line here too.
 */
export interface OpenSourceLicense {
  name: string;
  license: string;
  copyright: string;
}

export const LICENSE_TEXT_URLS: Readonly<Record<string, string>> = {
  MIT: 'https://opensource.org/license/mit',
  'Apache-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
  'SIL OFL 1.1': 'https://openfontlicense.org',
};

export const OPEN_SOURCE_LICENSES: readonly OpenSourceLicense[] = [
  { name: 'Nunito', license: 'SIL OFL 1.1', copyright: '2014 The Nunito Project Authors' },
  { name: 'Ionicons', license: 'MIT', copyright: 'Ionic (Drifty Co.)' },
  { name: 'React Native', license: 'MIT', copyright: 'Meta Platforms, Inc. and affiliates' },
  { name: 'React', license: 'MIT', copyright: 'Meta Platforms, Inc. and affiliates' },
  { name: 'Expo', license: 'MIT', copyright: '650 Industries, Inc.' },
  { name: '@expo/vector-icons', license: 'MIT', copyright: '2015 Joel Arvidsson' },
  { name: '@expo-google-fonts/nunito', license: 'MIT', copyright: '2020 Expo' },
  { name: 'Drizzle ORM', license: 'Apache-2.0', copyright: 'Drizzle Team' },
  { name: 'Zustand', license: 'MIT', copyright: 'Paul Henschel' },
  { name: 'i18next', license: 'MIT', copyright: 'Jan Mühlemann' },
  { name: 'react-i18next', license: 'MIT', copyright: 'Jan Mühlemann' },
  { name: 'react-native-gifted-charts', license: 'MIT', copyright: 'Abhinandan Kushwaha' },
  { name: 'react-native-svg', license: 'MIT', copyright: '2015-2016 Horcrux' },
  { name: 'react-native-reanimated', license: 'MIT', copyright: '2016 Software Mansion' },
  { name: 'react-native-purchases', license: 'MIT', copyright: 'RevenueCat, Inc.' },
];
