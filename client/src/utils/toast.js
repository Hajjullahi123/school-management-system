import { toast as hotToast } from 'react-hot-toast';

export const toast = {
  success: (message) => hotToast.success(message),
  error: (message) => hotToast.error(message),
  loading: (message) => hotToast.loading(message),
  info: (message) => hotToast(message, { icon: 'ℹ️' }),
  dismiss: (id) => hotToast.dismiss(id),
};
