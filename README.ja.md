# @nuxtjp/localized-site

[English](README.md)

日本語・英語の紹介サイトを、1つの検証済み設定から構成します。`/`、`/docs`、`/docs/getting-started`、`/docs/security`と各英語ページを生成し、言語切替とSEOを適用します。

## 導入と設定

公開版は `npm view @nuxtjp/localized-site version` で確認してください。Nuxt `^4.6.2`、Vue `^3.5.40`、Node.js 22.19以降または24.11以降を使用します。

```sh
pnpm add @nuxtjp/localized-site nuxt vue
```

```ts
export default defineNuxtConfig({
  modules: [['@nuxtjp/localized-site', { contentRoot: '.' }]]
})
```

`contentRoot`を明示します。[汎用設定サンプル](examples/content/site.config.json)を、そのディレクトリに`site.config.json`として置き、サイト固有の内容に置き換えてください。
`siteId`、`serviceId`、`origin`、`audienceScope`、完全なja/enコンテンツ、ちょうど3つのfeatures、導入・セキュリティ文書、privacy/contact説明、`externalActions: false`が必須です。

```sh
pnpm exec nuxtjp-localized-site validate --content-root .
pnpm exec nuxt build
```

## 動作と制約

privacy/contactは説明文として表示し、未設定のリンクや操作を生成しません。
メンテナンス表示は、ブラウザから同一originの`/maintenance.json`を読みます。取得・形式・期限の検証に失敗した場合は表示せず、サイト本文と言語切替は利用できます。
配布物だけを試す場合は、registry版の代わりに承認された正確なTGZを導入してください。この手順はサイトの公開やregistry設定を行いません。

## 型付きメッセージ

```ts
const messages = defineLocalizedMessages({
  ja: { save: '保存', cancel: 'キャンセル' },
  en: { save: 'Save', cancel: 'Cancel' }
})
const { t } = useLocalizedMessages(messages)
t('save')
```

英語のキーは日本語と一致させます。空のメッセージは`fallbackLocale`、次に`defaultLocale`へfallbackします。

## 開発

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm validate:example
pnpm pack
```

`prepack`はテスト、型検査、build、サンプル検証を実行します。リリース前に、実際のarchiveを別hostで確認してください。

## 文書とライセンス

[使い方](https://github.com/nuxtjp/site-builder/blob/main/docs/getting-started.md) · [Schema](schemas/localized-site-v1.schema.json) · [テスト](https://github.com/nuxtjp/site-builder/tree/main/test) · [セキュリティ報告](https://github.com/nuxtjp/site-builder/blob/main/SECURITY.md)

コードは[Apache-2.0](LICENSE)です。[LICENSE-PREVIOUS](LICENSE-PREVIOUS)に以前の許諾、[NOTICE](NOTICE)に帰属表示を保持します。
[LICENSE-ASSETS](LICENSE-ASSETS)は対象となるブランド・コンテンツ素材の別条件を保持します。コードのライセンスを変更せず、第三者やサイト所有者のコンテンツの権利を追加で許諾するものでもありません。

## Public showcase / OSS紹介

[Dashboard, product LP, public feed and owner operations](docs/public-showcase.ja.md) — 明示的に有効化する公開紹介機能。

## 組織のOSS紹介

content rootの `public/oss/showcase.json` に既存 `nuxtjp://showcase/v1` のreview済み公開snapshotを置くと、localeごとの `/oss` 一覧と `/oss/<entry-id>` 紹介ページを追加します。既存Showcase validator/component/collectorを再利用し、別のschemaや表示実装を増やしません。viewからprovider accountやregistryへ接続せず、未取得・期限切れと0件を区別します。各公開sourceのIssueへfeedbackを案内します。

組織presetは公開maintenanceファイルがない場合にendpointを無効化します。一般consumerは既存defaultを維持し、`maintenance: false` で明示的に無効化できます。状態を創作してoperationalと表示しません。公開snapshotはregular file・上限262144bytes・symlink不可とし、ルート競合は拒否します。

公開版はregistryで確認し、配布物と独立consumerの受入を確認して採用します。

Dependency updates: [repository policy](docs/dependency-updates.md).
Registry releases: [version tags and GitHub OIDC](docs/registry-release.md).


## 同意管理

`@nuxtjp/localized-site/consent` を独立したNuxtモジュールとして、または本モジュールの
`consent` オプションから利用できます。既存のCookieConsent 3.1.0を再利用し、定義検証・
日英UI・任意スクリプトの同意前停止・撤回後の再読込を提供します。
定義は `schemas/consent-v1.schema.json`、設定と制約は英語READMEの
「Declarative consent module」を参照してください。任意サービスなしでは自動バナーを出さず、
設定ボタンだけを設けます。Cloudflare側の自動挿入は別途管理が必要です。

英語が既定のサイトでは、同意設定に `defaultLocale: "en"` を指定できます。`/ja`・`/en` から始まるURLでは明示した言語を優先し、省略時は既存の日本語既定を保持します。
