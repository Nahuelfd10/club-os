"use client";

import { useEffect, useState } from "react";

import {
  fallbackClubConfig,
  getActiveClubConfig,
  type ActiveClubConfig,
} from "@/config/active-club";

export function useActiveClubConfig() {
  const [config, setConfig] = useState<ActiveClubConfig>(fallbackClubConfig);
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadConfig = async () => {
      try {
        const loaded = await getActiveClubConfig();
        if (mounted) {
          setConfig(loaded);
        }
      } finally {
        if (mounted) {
          setIsConfigLoading(false);
        }
      }
    };

    void loadConfig();

    return () => {
      mounted = false;
    };
  }, []);

  return { config, isConfigLoading };
}
