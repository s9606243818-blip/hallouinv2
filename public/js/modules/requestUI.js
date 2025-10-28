/**
 * UI запросов к ролям
 */

import socket from './socket.js';
import { showError, showSuccess } from '../utils/helpers.js';

class RequestUI {
  constructor() {
    this.requests = [];
  }

  init() {
    // Инициализация не требуется
  }

  showRequest(data) {
    const { requestId, requestType, fromNickname } = data;
    
    const typeNames = {
      heal: 'лечение',
      cards: 'карты',
      music: 'трек'
    };

    const typeName = typeNames[requestType] || requestType;
    
    const confirmed = confirm(`${fromNickname} запросил ${typeName}. Принять запрос?`);
    
    if (confirmed) {
      socket.acceptRequest(requestId);
      showSuccess(`Запрос принят`);
    } else {
      socket.declineRequest(requestId);
    }
  }
}

export default new RequestUI();
