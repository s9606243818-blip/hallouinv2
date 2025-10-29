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

    if (file.size > 4 * 1024 * 1024) {
      showError('Файл слишком большой (макс 4MB)');
      return;
    }

    try {
      // Сжимаем изображение через Canvas
      const compressedBlob = await this.compressImage(file);
      
      const formData = new FormData();
      formData.append('avatar', compressedBlob, file.name);

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

  compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Максимальный размер 500x500
          let width = img.width;
          let height = img.height;
          const maxSize = 500;
          
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Рисуем сжатое изображение
          ctx.drawImage(img, 0, 0, width, height);
          
          // Конвертируем в Blob (качество 85%)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Не удалось сжать изображение'));
              }
            },
            'image/jpeg',
            0.85
          );
        };
        
        img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }
}

export default new AvatarUpload();
