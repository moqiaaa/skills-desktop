export interface MarketplaceSkill {
  id: string;
  skillId?: string;  // Original skillId from API for reporting
  name: string;
  author: string;
  authorAvatar: string;
  description: string;
  descriptionZh?: string; // 涓枃鎻忚堪锛堝彲閫夛級
  descriptionEn?: string; // 鑻辨枃鎻忚堪锛堝彲閫夛級
  githubUrl: string;
  stars: number;
  forks: number;
  updatedAt: number;
  hasMarketplace: boolean;
  path: string;
  branch: string;
}

export interface InstalledSkill extends Partial<MarketplaceSkill> {
  id: string;
  name: string;
  description: string;
  descriptionZh?: string; // 涓枃鎻忚堪锛堝彲閫夛級
  descriptionEn?: string; // 鑻辨枃鎻忚堪锛堝彲閫夛級
  installDate: number;
  localPath: string;
  status: 'safe' | 'unsafe' | 'unknown';
  type: 'system' | 'project';
  version?: string;

  // 瀹夎鍏冩暟鎹?
  source?: 'marketplace' | 'github' | 'local';  // 鏉ユ簮
  sourceUrl?: string;                            // 鏉ユ簮 URL (GitHub 鍦板潃)
  installedVersion?: string;                     // 瀹夎鏃剁殑鐗堟湰
  latestVersion?: string;                        // 鏈€鏂扮増鏈?
  hasUpdate?: boolean;                           // 鏄惁鏈夋洿鏂?
  lastChecked?: number;                          // 涓婃妫€鏌ユ洿鏂版椂闂?
  commitHash?: string;                           // 瀹夎鏃剁殑 commit hash
  latestCommitHash?: string;                     // 鏈€鏂扮殑 commit hash
  note?: string;
  tags?: string[];
}

export interface SkillManifest {
  name: string;
  description: string;
  descriptionZh?: string; // 涓枃鎻忚堪锛堝彲閫夛級
  descriptionEn?: string; // 鑻辨枃鎻忚堪锛堝彲閫夛級
  version?: string;
  author?: string;
  license?: string;
  [key: string]: any;
}

// 瀹夎缁撴灉
export interface InstallResult {
  success: boolean;
  message: string;
  blocked: boolean;
  securityReport?: SecurityReport;
  skillMetadata?: SkillMetadata;
}

// 瀹夎鏃朵繚瀛樼殑鍏冩暟鎹?
export interface SkillMetadata {
  name: string;
  version: string;
  source: 'marketplace' | 'github' | 'local';
  sourceUrl?: string;
  installDate: number;
  commitHash?: string;
  author?: string;
  description?: string;
  note?: string;
  tags?: string[];
}

// 瀹夊叏鎶ュ憡
export interface SecurityReport {
  skillId: string;
  score: number;
  level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  issues: SecurityIssue[];
  blocked: boolean;
  recommendations: string[];
  scannedFiles: string[];
}

export interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  file?: string;
  line?: number;
}

