# MarkdownとMDCの編集・生成

2026年10月28日。`@nuxtjp/localized-site` 0.4.0のsource candidateで実装した構成。
編集形式はユーザー指定に従いNuxt Content標準のMDCを使用する。
正式なnpm公開、consumerの公開版固定、各サイトの配備は別の受入である。
0.3.1以前に`@nuxtjp/localized-site/documents`はなく、旧版のまま本変更を導入できない。

## 原典

| ファイル | 編集する内容 |
| --- | --- |
| `documents/{ja,en}/**/*.md` | frontmatter、見出し、本文、コード、MDCリンクカード |
| `site.json` | origin、defaultLocale、ブランド、navigation、resources、言語別pageOrder |
| 既存の公開JSON | 製品・版・観測・画面の構成など、既存ownerが管理するデータ |
| `.generated-documents/` | 公式MDC ASTと表示用map、標準Markdown。Git管理と手編集の対象外 |

旧`content.json`からの読取りとPageSectionsによる本文描画は削除した。
MDX・JSX用の入力、compiler、依存と互換処理は持たない。
ファイル名から公開順や意味IDを推定しない。`pageOrder`に登録されたpublished文書だけが
HTML用データ、表示用AST、Markdown、llms.txtに入る。
draftは全経路から除外し、登録漏れ、重複route、draftへの公開参照は生成を失敗させる。

````md
---
path: "/docs"
title: "利用ガイド"
summary: "対象と利用条件を確認します。"
kind: "page"
status: "published"
---

## 対象

公開済みの製品について説明します。

::document-link{title="導入手順" href="/docs/getting-started" summary="条件を確認して進みます。"}
::
````

frontmatterのkeyは`path`、`title`、`summary`、`kind`、`status`、任意の`label`、`category`。
本文はH2から始める。kindはhome、page、catalog、journal、article。
部品はblockの`document-link`を登録し、title、href、summary、iconの文字列属性を受け付ける。
未登録部品、binding、動的props、event、埋込みHTMLを拒否する。
ソースはownerがreviewする。外部から受信したMDCを実行するAPIは追加しない。

[公式Nuxt MDC](https://github.com/nuxt-content/mdc)の`@nuxtjs/mdc` 0.23.2を固定し、
公開APIの`parseMarkdown`、`stringifyMarkdown`、`MDCRenderer`を使用する。
独自のMDC parserやMarkdown言語は作らない。Nuxt Contentの全文検索用DBを導入する
consumerは同じ`.md`とMDC記法を採用できるが、本変更はDB・検索・CMSの追加を必須にしない。

## 生成APIと配信

```js
import { loadSiteDocuments, documentPublicDirectory } from '@nuxtjp/localized-site/documents'
const root = new URL('./', import.meta.url)
const content = await loadSiteDocuments(root)
const publicDirectory = await documentPublicDirectory(root)
```

Node側は現在のソースを検証し、Vue側は生成されたcontent snapshotと公式MDC ASTを
MDCRendererで表示する。生成物をauthoring APIの代替入力にはしない。
共通moduleが公式MDC moduleを導入し、サイトmoduleがpublicDirectoryをNitro publicAssetsに登録する。

| HTML routeの例 | 標準Markdown |
| --- | --- |
| `/` | `/raw/index.md` |
| `/en/`または`/en` | `/raw/en.md` |
| `/docs` | `/raw/docs.md` |
| `/en/docs` | `/raw/en/docs.md` |

公開HTMLには`rel="alternate" type="text/markdown"`を追加し、`/llms.txt`から全登録文書を参照できる。
MDCカードは標準Markdownのリンクと説明へ展開する。catalogの公開resource facts、記事一覧、
sitemapも同じ公開selectionから展開する。本文、コード、リンク先は同じ入力を用い、
コード例中のURL文字列を言語切替で書き換えない。日英の内部リンクは各localeの公開URLにする。
標準構成の言語トップは`/en`、既存のカスタム構成は`/en/`を使い、
生成するMarkdownのCanonicalをHTMLに揃える。標準構成では生成metadataの
`localeRootTrailingSlash: false`でこのroute契約を明示する。

生成した`_headers`は`/raw/*`へ`text/markdown; charset=utf-8`と`nosniff`を指定する。
このファイルを適用するか、Workerが配信headerを設定するかは配備ownerの責務。
同一URLのAccept切替、形式別ETag、CDN実応答、HEAD・条件付き要求は未受入であり、
Cloudflareの自動HTML変換やProプランの機能をこの生成の前提にしない。

標準の`site.config.json`を使うconsumerも、検証済みの公開データからMarkdown/MDCを生成して
同じparserとrendererを通す。入力JSONのデータ契約は保持する。サービス状態、署名付き配布物、
認証・実行許可を文書形式の移行を理由に変更しない。動的UI、フォーム、観測値は別の
公開契約を持ち、静的Markdownの存在でその動作や鮮度の一致を保証しない。
製品固有のpublic JSONを加える場合もownerが選んだ公開projectionを使う。

## 検証と導入

共通packageで`pnpm test`、`pnpm typecheck`、`pnpm build`、`pnpm validate:example`を実行する。
`pnpm test:documents`は公式MDC parser、Markdownの情報保持、draft除外、禁止入力、
言語別URL、コード例の保持、標準JSON consumerを確認する。
各consumerでも実際のarchiveを導入して既存のtests、typecheck、buildを実行する。
archive consumerはNuxt SSRと標準MarkdownのHTTP応答を検証する。

consumerの正式依存更新は、[repositoryの公開手順](registry-release.md)で0.4.0を公開し、
公式archiveとprovenanceを確認してから`pnpm add --save-exact @nuxtjp/localized-site@0.4.0`で
manifestとlockを同時更新する。未公開版のregistry URLやintegrityをlockへ捏造しない。
source candidateのローカル試験は正式依存の更新、正式公開、配備を意味しない。

既存の`.sem`、JSON Schema、API・catalog・lockのJSONはそれぞれのnative契約を維持する。
意味解析にはMDCを展開した標準Markdownと明示した語彙・contextを用い、見出し名からTermIdを
推測しない。[sem-lang連携方針](agent-readable-documents.ja.md)を参照。


## 0.5.0 の宣言的なページと CSS の所有

`NuxtJpServiceSite` がヘッダー、経路、SEO、ヒーロー、MDC 文書、検索、関連記事、
フッターを描画する。サイトの `SitePage.vue` は、公開文書の生成結果とサイト所有の
表示データを渡し、必要な名前付き slot に固有コンポーネントを宣言する。
共通の部品や CSS をサイトへコピーしない。

```vue
<script setup lang="ts">
import data from './.generated-documents/content.json'
import documents from './.generated-documents/components.mjs'
import experiences from './experience.json'
import type { ServiceSiteData, ServiceExperiences } from '@nuxtjp/localized-site/service-site'
const siteData = data as ServiceSiteData
const siteExperiences = experiences as ServiceExperiences
</script>
<template>
  <NuxtJpServiceSite :data="siteData" :documents="documents" :experiences="siteExperiences" />
</template>
```

共通 CSS は `src/runtime/service-site/site.css` をモジュールが一度だけ登録する。
`.service-site` 内に限定し、通常の表示と portfolio 表示を `appearance` で選ぶ。
`navigation-mode` は mobile-menu / tablet-menu、`hero-variants` は経路ごとの
policy / install、`next-step-exclusions` は案内を出さない経路、`downloads` は
パッケージ利用状況の表示を宣言する。サイト固有 ID による業務分岐は共通 UI へ持ち込まない。

`hero-art`、`before-document`、`document`、`after-document`、`next-steps`、
`footer-links` の slot は locale / path / page / content / local / Document を受け取る。
`Document` は選択された MDC を同じ共通描画器で表示する部品であり、規約、稼働状況、
導入画面などを選んだ経路だけ差し替えられる。ネットワーク取得、公開可否、署名、
製品固有の判断は従来の所有者に残る。固有部品の CSS はそのコンポーネントに内包し、
ページやサイトルートのグローバル CSS へ戻さない。

経路アダプターは CSS、`<style>`、インラインの style / :style、CSS import を持たない。
サイトの Nuxt モジュールで `@nuxtjp/localized-site/declarative` の
`validatePageAdapter(file)` を呼び、ビルド前にこの制約を確認する。
MDC の部品・属性 allowlist と公開選択の検証も引き続き有効である。
この検査は任意の JavaScript の安全性を証明する sandbox ではない。

0.4.0 の正式配布物は従来の MDC 文書 API を提供する。この共通表示 API は
0.5.0 以降を必要とし、正式公開・依存 lock 更新・本番配備の受入は別に記録する。
