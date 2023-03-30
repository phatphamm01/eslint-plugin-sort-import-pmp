import { TOptions, TOptionsInput } from '../type';

export default function formatOptions(options: TOptionsInput) {
  return {
    ...options,
    importOrder: options.importOrder.map((item) => {
      return item.split('--comment').map((item) => item.trim());
    }),
  };
}
