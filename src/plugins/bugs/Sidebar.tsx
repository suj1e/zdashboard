import { usePluginConfig } from '../../web/hooks/usePluginConfig.js';
import { ConfigField } from '../../web/components/ConfigField.js';

const BUGS_CONFIG_SCHEMA = {
  url: { type: 'string' as const, label: '服务器 URL', default: '' },
  account: { type: 'string' as const, label: '账号', default: '' },
  token: { type: 'string' as const, label: 'Token', default: '' },
  product: { type: 'number' as const, label: '产品 ID', default: 0 },
};

export default function Sidebar() {
  const { config, save, saving } = usePluginConfig('bugs', BUGS_CONFIG_SCHEMA);

  const handleChange = (key: string, value: unknown) => {
    const next = { ...config, [key]: value };
    save(next);
  };

  return (
    <div className="p-3">
      <div className="text-xs text-muted-foreground mb-3">禅道 Bugs 配置</div>
      <div className="space-y-3">
        <ConfigField key_="url" field={BUGS_CONFIG_SCHEMA.url} value={config.url} onChange={handleChange} />
        <ConfigField key_="account" field={BUGS_CONFIG_SCHEMA.account} value={config.account} onChange={handleChange} />
        <ConfigField key_="token" field={BUGS_CONFIG_SCHEMA.token} value={config.token} onChange={handleChange} />
        <ConfigField key_="product" field={BUGS_CONFIG_SCHEMA.product} value={config.product} onChange={handleChange} />
        <div className="text-xs text-muted-foreground">{saving ? '保存中…' : '配置已保存'}</div>
      </div>
    </div>
  );
}
