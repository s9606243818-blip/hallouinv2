/**
 * Летящие анимации EXP и HP
 */

class FloatingNumbers {
  
  /**
   * Показать летящий +EXP
   */
  showExpGain(amount, element = null) {
    const floating = this.createFloatingElement(
      `+${amount} EXP`,
      '#ffd700', // Золотой
      '⭐'
    );
    
    this.animateFloat(floating, element);
  }
  
  /**
   * Показать летящий -HP
   */
  showHpLoss(amount, element = null) {
    const floating = this.createFloatingElement(
      `-${amount} HP`,
      '#ef4444', // Красный
      '💔'
    );
    
    this.animateFloat(floating, element, 'shake');
  }
  
  /**
   * Показать летящий +HP
   */
  showHpGain(amount, element = null) {
    const floating = this.createFloatingElement(
      `+${amount} HP`,
      '#10b981', // Зелёный
      '❤️'
    );
    
    this.animateFloat(floating, element);
  }
  
  /**
   * Показать повышение уровня
   */
  showLevelUp(newLevel, element = null) {
    const floating = this.createFloatingElement(
      `LEVEL ${newLevel}!`,
      '#a855f7', // Фиолетовый
      '🎉'
    );
    
    floating.style.fontSize = '2.5rem';
    this.animateFloat(floating, element, 'levelup');
  }
  
  /**
   * Создать элемент летящей цифры
   */
  createFloatingElement(text, color, icon) {
    const floating = document.createElement('div');
    floating.className = 'floating-number';
    floating.innerHTML = `
      <span class="floating-icon">${icon}</span>
      <span class="floating-text">${text}</span>
    `;
    
    floating.style.cssText = `
      position: fixed;
      z-index: 10000;
      font-size: 2rem;
      font-weight: 900;
      color: ${color};
      text-shadow: 
        0 0 10px ${color},
        0 0 20px ${color},
        0 2px 4px rgba(0, 0, 0, 0.5);
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    return floating;
  }
  
  /**
   * Анимировать полёт
   */
  animateFloat(element, targetElement, animationType = 'float') {
    // Определяем начальную позицию
    let startX, startY;
    
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    } else {
      startX = window.innerWidth / 2;
      startY = window.innerHeight / 2;
    }
    
    element.style.left = startX + 'px';
    element.style.top = startY + 'px';
    element.style.transform = 'translate(-50%, -50%) scale(0)';
    
    document.body.appendChild(element);
    
    // Запускаем анимацию
    requestAnimationFrame(() => {
      if (animationType === 'shake') {
        this.animateShake(element, startX, startY);
      } else if (animationType === 'levelup') {
        this.animateLevelUp(element);
      } else {
        this.animateFloatUp(element);
      }
    });
  }
  
  /**
   * Анимация полёта вверх (для EXP)
   */
  animateFloatUp(element) {
    element.style.transition = 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
    element.style.transform = 'translate(-50%, -250px) scale(1.5)';
    element.style.opacity = '0';
    
    setTimeout(() => element.remove(), 1500);
  }
  
  /**
   * Анимация тряски (для -HP)
   */
  animateShake(element, startX, startY) {
    element.style.transform = 'translate(-50%, -50%) scale(1)';
    
    // Тряска
    let shakeCount = 0;
    const shakeInterval = setInterval(() => {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      element.style.left = (startX + offsetX) + 'px';
      element.style.top = (startY + offsetY) + 'px';
      
      shakeCount++;
      if (shakeCount > 10) {
        clearInterval(shakeInterval);
        
        // После тряски улетает вниз
        element.style.transition = 'all 1s ease-in';
        element.style.transform = 'translate(-50%, 250px) scale(0.5)';
        element.style.opacity = '0';
        
        setTimeout(() => element.remove(), 1000);
      }
    }, 50);
  }
  
  /**
   * Анимация Level Up
   */
  animateLevelUp(element) {
    element.style.transition = 'all 2s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Появление с вращением
    setTimeout(() => {
      element.style.transform = 'translate(-50%, -50%) scale(1.2) rotate(360deg)';
    }, 10);
    
    // Исчезновение
    setTimeout(() => {
      element.style.opacity = '0';
      element.style.transform = 'translate(-50%, -150px) scale(2)';
    }, 1000);
    
    setTimeout(() => element.remove(), 2000);
  }
}

export default new FloatingNumbers();
