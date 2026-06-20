export type CompanyProfile = {
  ticker: string;
  displayName: string;
  shortName: string;
  description: string;
};

const fallbackDescription = "公开预测账本中的公司记录，用于查看历史预测、结果和误差变化。";

export const companyProfiles: Record<string, CompanyProfile> = {
  "0700.HK": {
    ticker: "0700.HK",
    displayName: "0700.HK · 腾讯控股",
    shortName: "腾讯控股",
    description: "中国互联网平台公司，业务覆盖社交、游戏、广告、金融科技和云服务。",
  },
  "1211.HK": {
    ticker: "1211.HK",
    displayName: "1211.HK · 比亚迪",
    shortName: "比亚迪",
    description: "新能源汽车与动力电池公司，记录关注销量、价格和产业链变化。",
  },
  "1810.HK": {
    ticker: "1810.HK",
    displayName: "1810.HK · 小米集团",
    shortName: "小米集团",
    description: "智能手机、IoT 与智能电动车公司，记录关注产品周期和生态业务。",
  },
  "3690.HK": {
    ticker: "3690.HK",
    displayName: "3690.HK · 美团",
    shortName: "美团",
    description: "本地生活与即时零售平台，记录关注消费、竞争和履约效率变化。",
  },
  "6060.HK": {
    ticker: "6060.HK",
    displayName: "6060.HK · 众安在线",
    shortName: "众安在线",
    description: "互联网保险科技公司，记录关注承保质量、渠道和科技投入。",
  },
  "9988.HK": {
    ticker: "9988.HK",
    displayName: "9988.HK · 阿里巴巴",
    shortName: "阿里巴巴",
    description: "电商、云计算和数字服务平台，记录关注消费、云业务和竞争格局。",
  },
  AAPL: {
    ticker: "AAPL",
    displayName: "AAPL · 苹果",
    shortName: "苹果",
    description: "消费电子与服务公司，记录关注产品周期、硬件需求和服务收入。",
  },
  MSFT: {
    ticker: "MSFT",
    displayName: "MSFT · 微软",
    shortName: "微软",
    description: "软件、云和 AI 基础设施公司，记录关注云增速与企业软件需求。",
  },
  NVDA: {
    ticker: "NVDA",
    displayName: "NVDA · 英伟达",
    shortName: "英伟达",
    description: "AI 加速芯片与数据中心公司，记录关注算力需求、供应链和估值波动。",
  },
  TSM: {
    ticker: "TSM",
    displayName: "TSM · 台积电",
    shortName: "台积电",
    description: "晶圆代工龙头公司，记录关注先进制程、客户需求和半导体周期。",
  },
};

export function getCompanyProfile(ticker: string, company: string): CompanyProfile {
  return (
    companyProfiles[ticker] ?? {
      ticker,
      displayName: `${ticker} · ${company}`,
      shortName: company,
      description: fallbackDescription,
    }
  );
}
