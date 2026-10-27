import type { Translation } from 'vanilla-cookieconsent'
import type { ConsentOptions } from './config'
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export function translations(options: ConsentOptions, en: boolean): Translation {
  const policy = `<a href="${escape(options.policyUrl)}">${en ? 'Privacy policy' : '共通プライバシーポリシー'}</a>`
  const descriptions = {
    functional: en ? 'Optional features' : '任意の機能',
    analytics: en ? 'Audience measurement' : 'アクセス解析',
    marketing: en ? 'Marketing' : '広告・マーケティング'
  }
  return {
    consentModal: {
      title: en ? 'Privacy choices' : 'プライバシーの選択',
      description: (en ? 'Optional services stay off until you choose to allow them. You can continue browsing without accepting. ' : '任意のサービスは許可するまで動作しません。拒否しても閲覧できます。') + policy,
      acceptAllBtn: en ? 'Accept all' : 'すべて許可',
      acceptNecessaryBtn: en ? 'Reject optional' : '任意のサービスを拒否',
      showPreferencesBtn: en ? 'Manage choices' : '個別に設定'
    },
    preferencesModal: {
      title: en ? 'Privacy settings' : 'プライバシー設定',
      acceptAllBtn: en ? 'Accept all' : 'すべて許可',
      acceptNecessaryBtn: en ? 'Reject optional' : '任意のサービスを拒否',
      savePreferencesBtn: en ? 'Save choices' : '選択を保存',
      closeIconLabel: en ? 'Close' : '閉じる',
      sections: [
        { title: en ? 'Privacy notice' : '個人情報の取り扱い', description: policy },
        { title: en ? 'Essential operation' : '必要な機能', linkedCategory: 'necessary', description: (en ? 'Delivery, security and saving your privacy choices. Connection metadata can be processed by hosting providers. ' : 'ページ配信・安全対策・選択の保存に必要な機能です。配信事業者が接続情報を処理する場合があります。') + policy },
        ...(['functional', 'analytics', 'marketing'] as const).filter(category => options.services.some(s => s.category === category)).map(category => ({
          title: descriptions[category], linkedCategory: category,
          description: options.services.filter(s => s.category === category).map(s => `<strong>${escape(s.label)}</strong>: ${escape(s.purpose)}`).join('<br>')
        })),
        ...(options.services.length ? [] : [{title: en ? 'No additional services configured' : '追加サービスの登録はありません', description: en ? 'This site currently declares no optional tracking or embedded services. Browser settings do not control hosting-provider processing.' : '現在、このサイトの定義に任意の追跡・埋め込みサービスはありません。配信事業者による処理はブラウザの設定では制御できません。'}])
      ]
    }
  }
}
