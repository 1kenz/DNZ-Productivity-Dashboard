'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from './PromptTemplates.module.css';

export interface PromptTemplate {
  id: string;
  icon: string;
  title: Record<string, string>;
  desc: Record<string, string>;
  prompt: Record<string, string>;
}

const TEMPLATES: PromptTemplate[] = [
  {
    id: 'cybersec',
    icon: '🛡️',
    title: {
      en: 'Cybersecurity & Lab',
      tr: 'Siber Güvenlik & Lab',
      de: 'Cybersicherheit & Lab',
    },
    desc: {
      en: 'Vulnerability analysis, CTF steps, or CVE research.',
      tr: 'Zafiyet analizi, CTF adımları veya CVE araştırması.',
      de: 'Schwachstellenanalyse, CTF-Schritte oder CVE-Recherche.',
    },
    prompt: {
      en: 'As a Senior Cybersecurity Expert, analyze the following vulnerability/scenario and explain mitigation/reproduction steps: ',
      tr: 'Bir Kıdemli Siber Güvenlik Uzmanı olarak, şu zafiyeti/senaryoyu analiz et ve çözüm/sömürü adımlarını açıkla: ',
      de: 'Analysieren Sie als leitender Cybersicherheitsexperte die folgende Schwachstelle/Szenario und erklären Sie die Behebungs-/Reproduktionsschritte: ',
    },
  },
  {
    id: 'code-review',
    icon: '💻',
    title: {
      en: 'Code Review & Refactor',
      tr: 'Kod İnceleme & Refactor',
      de: 'Code-Review & Refactoring',
    },
    desc: {
      en: 'Performance, security, and clean architecture audit.',
      tr: 'Performans, güvenlik ve temiz mimari denetimi.',
      de: 'Leistungs-, Sicherheits- und Clean-Architecture-Prüfung.',
    },
    prompt: {
      en: 'As a Principal Software Architect, review the following code snippet, identify performance/security issues, and provide refactored code:\n```\n\n```',
      tr: 'Bir Principal Software Architect olarak şu kod parçasını incele, güvenlik/performans açıklarını bul ve refactor edilmiş halini sun:\n```\n\n```',
      de: 'Überprüfen Sie als leitender Softwarearchitekt den folgenden Codeausschnitt, identifizieren Sie Sicherheits-/Leistungsprobleme und stellen Sie refaktorierten Code bereit:\n```\n\n```',
    },
  },
  {
    id: 'deutsch',
    icon: '🇩🇪',
    title: {
      en: 'German B2/C1 Practice',
      tr: 'Almanca B2/C1 Pratik',
      de: 'Deutsch B2/C1 Praxis',
    },
    desc: {
      en: 'Grammar check, vocabulary expansion, and professional letters.',
      tr: 'Dilbilgisi kontrolü, kelime dağarcığı ve resmi mektup.',
      de: 'Grammatikprüfung, Wortschatzerweiterung und professionelle Briefe.',
    },
    prompt: {
      en: 'As a German language tutor, review the following text at B2/C1 level, correct grammatical errors, and suggest fluent native phrasing:\n',
      tr: 'Bir Almanca öğretmeni olarak şu metni B2 seviyesinde kontrol et, dilbilgisi hatalarını düzelt ve daha akıcı alternatifler öner:\n',
      de: 'Überprüfen Sie als Deutschlehrer den folgenden Text auf B2/C1-Niveau, korrigieren Sie Grammatikfehler und schlagen Sie flüssige Alternativen vor:\n',
    },
  },
  {
    id: 'daily-planner',
    icon: '📋',
    title: {
      en: 'Daily Focus Plan',
      tr: 'Günün Odak Planı',
      de: 'Tages-Fokusplan',
    },
    desc: {
      en: 'Time blocking and high-impact task prioritization.',
      tr: 'Zaman bloklama ve görev önceliklendirme.',
      de: 'Zeitblockierung und Aufgabenpriorisierung.',
    },
    prompt: {
      en: 'Review the following daily tasks and prioritize them into productive 25-minute Pomodoro focus blocks:\n1. ',
      tr: 'Bugün yapmam gereken şu işleri incele ve en verimli 25 dakikalık Pomodoro bloklarına ayırarak sırala:\n1. ',
      de: 'Überprüfen Sie die folgenden Tagesaufgaben und teilen Sie sie in produktive 25-Minuten-Pomodoro-Blöcke ein:\n1. ',
    },
  },
];

interface PromptTemplatesProps {
  onSelectTemplate: (prompt: string) => void;
}

export const PromptTemplates: React.FC<PromptTemplatesProps> = ({
  onSelectTemplate,
}) => {
  const { language } = useLanguage();
  const langKey = language in { en: 1, tr: 1, de: 1 } ? language : 'en';

  return (
    <div className={styles.templateContainer}>
      {TEMPLATES.map((tmpl) => (
        <button
          key={tmpl.id}
          type="button"
          className={styles.templateCard}
          onClick={() => onSelectTemplate(tmpl.prompt[langKey] || tmpl.prompt.en)}
        >
          <div className={styles.cardHeader}>
            <span className={styles.icon}>{tmpl.icon}</span>
            <span className={styles.title}>{tmpl.title[langKey] || tmpl.title.en}</span>
          </div>
          <div className={styles.desc}>{tmpl.desc[langKey] || tmpl.desc.en}</div>
        </button>
      ))}
    </div>
  );
};
