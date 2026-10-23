# Getting started / 導入

## 日本語

紹介・導入・セキュリティの日本語と英語を同じ設定で管理します。
公開確認後に、Nuxtホストへパッケージを導入してください。`0.1.0`は現在公開準備中です。

```sh
pnpm add --save-exact @nuxtjp/localized-site@0.2.7 nuxt@4.6.2 vue@3.5.43
```

```ts
export default defineNuxtConfig({
  modules: [['@nuxtjp/localized-site', { contentRoot: '.' }]]
})
```

`examples/content/site.config.json`をcontent rootへ置き、汎用サンプルを自分のサイト内容に変更します。
公開schemaに従いja/en両方を記入し、`origin`に実際のサイトURLを指定してください。

```sh
pnpm exec nuxtjp-localized-site validate --content-root .
pnpm exec nuxt typecheck
pnpm exec nuxt build
```

成功すると4ページと言語別の経路が生成されます。言語切替はqueryとfragmentを保持します。
privacy/contactは説明のみで、リンク先や送信機能を仮定しません。
任意のメンテナンス案内は同一originの`/maintenance.json`から取得し、失敗・不正・期限切れの場合は表示しません。
サイトの配備とpackage公開は別の承認・設定で実施します。

## English

Use one configuration for Japanese/English introduction, getting-started and security content.
Verify registry publication before installing `0.1.0`; it is currently being prepared for release.

Install the exact package with Nuxt 4.6.2 and Vue 3.5.43, register the module with an explicit `contentRoot`, then copy and customize the generic example.
Both locales must satisfy the schema. Set `origin` to the actual public site URL.
Run content validation, host typecheck and host build using the commands above.

The module generates four pages per locale and retains query/fragment values when switching languages.
Privacy/contact notices remain text, with no assumed destinations or submission actions.
The optional maintenance notice reads same-origin `/maintenance.json`; retrieval failures, invalid data or expiry hide the notice.
Website deployment and package publication require their own reviewed setup.

For pre-release verification, replace the registry package with the exact reviewed TGZ, then test in an independent host.
Use Node.js 22.19+ or 24.11+ and `pnpm@10.29.3`. Node 24.15.0 is the locally verified runtime.
