import { create } from 'zustand';

interface EEGData {
  alpha_band: number;
  beta_band: number;
  theta_band: number;
  delta_band: number;
  gamma_band: number;
  dominant_band: string;
  alpha_beta_ratio: number;
  alpha_delta_ratio: number;
  peak_alpha_freq: number;
  timestamp: string;
}

interface ConfigState {
  name: string;
  height: string;
  x: string;
  y: string;
  eegData: EEGData | null;

  setName: (name: string) => void;
  setHeight: (height: string) => void;
  setX: (x: string) => void;
  setY: (y: string) => void;
  setEegData: (data: EEGData) => void;
  resetConfig: () => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  name: '',
  height: '',
  x: '',
  y: '',
  eegData: null,

  setName: (name) => set({ name }),
  setHeight: (height) => set({ height }),
  setX: (x) => set({ x }),
  setY: (y) => set({ y }),
  setEegData: (data) => set({ eegData: data }),

  resetConfig: () =>
    set({
      name: '',
      height: '',
      x: '',
      y: '',
      eegData: null,
    }),
}));
