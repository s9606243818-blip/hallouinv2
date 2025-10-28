/**
 * Загрузка аватара - С ОБНОВЛЕНИЕМ ЧЕРЕЗ SOCKET
 */

import { showError, showSuccess, getElement } from '../utils/helpers.js';
import socket from './socket.js';

class AvatarUpload {
  constructor() {
    this.init();
  }

  init() {
    const uploadInput = getElement('avatarUpload');
    if (!uploadInput) return;

    uploadInput.addEventListener('change', (e) => {
      this.handleUpload(e.target.files[0]);
    });
  }

  async handleUpload(file) {
    if (!file) return;

    if (!file.type.match(/image\/(jpeg|png|jpg)/)) {
      showError('Только JPG и PNG форматы');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showError('Файл слишком большой (макс 2MB)');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/upload-avatar', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Обновить локально
        const avatar = getElement('playerAvatar');
        if (avatar) {
          avatar.src = data.avatarPath + '?t=' + Date.now();
        }
        
        // Отправить на сервер для обновления всем
        socket.updateAvatar(data.avatarPath);
        
        showSuccess('Аватар загружен!');
      } else {
        showError(data.error || 'Ошибка загрузки');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showError('Ошибка при загрузке аватара');
    }
  }
}

export default new AvatarUpload();
