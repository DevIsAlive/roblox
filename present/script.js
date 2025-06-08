class PresentAnimation {
  constructor() {
    this.present = document.getElementById("present")
    this.hand = document.getElementById("hand")
    this.robux = document.getElementById("robux")
    this.robuxCounter = document.getElementById("robuxCounter")
    this.counterText = document.getElementById("counterText")
    this.container = document.getElementById("container")
    this.screenFlash = document.getElementById("screenFlash")
    this.sheenOverlay = document.getElementById("sheenOverlay")
    this.whiteTransition = document.getElementById("whiteTransition")
    this.clickCount = 0
    this.maxClicks = 4
    this.isAnimating = false

    this.init()
  }

  init() {
    // Start the entrance animation
    setTimeout(() => {
      this.bounceIn()
    }, 500)
  }

  bounceIn() {
    this.present.style.visibility = "visible"; // Make present visible just before animation
    this.present.classList.add("animate-bounce-in")

    // Add enticing shake animation after bounce
    setTimeout(() => {
      this.present.classList.add("animate-enticing-shake")
      this.showHand()
    }, 1200)
  }

  showHand() {
    // Show hand with fade in
    this.hand.style.opacity = "1"
    this.hand.classList.add("animate-hand-fade-in")

    // Add hovering and shaking animations after fade in completes
    setTimeout(() => {
      this.hand.classList.add("animate-hand-hover", "animate-hand-shake")
    }, 800)

    // Add click listener
    this.present.addEventListener("click", () => this.handleClick())
  }

  handleClick() {
    if (this.isAnimating) return

    this.isAnimating = true
    this.clickCount++

    // Hide hand instantly on first click
    if (this.clickCount === 1) {
      this.hand.style.opacity = "0"
      this.hand.style.display = "none"
    }

    // Add glow effect based on click count
    this.addGlowEffect()

    // Create sheen effect
    this.createSheenEffect()

    // Create massive impact effects
    this.createImpactEffects()

    // Create impact particles on each click
    this.createClickParticles()

    if (this.clickCount >= this.maxClicks) {
      setTimeout(() => {
        this.finalExplosion()
      }, 500)
    } else {
      // Increase shake intensity slightly
      const currentDuration = 3 - this.clickCount * 0.3
      this.present.style.animationDuration = `${currentDuration}s`

      setTimeout(() => {
        this.isAnimating = false
      }, 600)
    }
  }

  createSheenEffect() {
    // Reset the sheen overlay position and make it visible
    this.sheenOverlay.style.left = "-100%"
    this.sheenOverlay.style.opacity = "1"

    // Trigger the sheen animation
    this.sheenOverlay.classList.add("animate-sheen-sweep")

    // Remove the animation class and hide the sheen after it completes
    setTimeout(() => {
      this.sheenOverlay.classList.remove("animate-sheen-sweep")
      this.sheenOverlay.style.opacity = "0"
    }, 600)
  }

  createImpactEffects() {
    // Screen shake
    this.container.classList.add("animate-screen-shake")
    setTimeout(() => {
      this.container.classList.remove("animate-screen-shake")
    }, 500)

    // Screen flash
    this.screenFlash.classList.add("animate-screen-flash")
    setTimeout(() => {
      this.screenFlash.classList.remove("animate-screen-flash")
    }, 300)

    // Impact ring
    const ring = document.createElement("div")
    ring.classList.add("impact-ring", "animate-impact-ring")
    this.container.appendChild(ring)

    setTimeout(() => {
      if (ring.parentNode) {
        ring.parentNode.removeChild(ring)
      }
    }, 600)

    // Multiple impact rings for more drama
    setTimeout(() => {
      const ring2 = document.createElement("div")
      ring2.classList.add("impact-ring", "animate-impact-ring")
      ring2.style.borderColor = "rgba(255, 215, 0, 0.6)"
      this.container.appendChild(ring2)

      setTimeout(() => {
        if (ring2.parentNode) {
          ring2.parentNode.removeChild(ring2)
        }
      }, 600)
    }, 100)
  }

  addGlowEffect() {
    // Remove previous glow
    this.present.classList.remove("glow-1", "glow-2", "glow-3", "glow-4")

    // Add new glow
    this.present.classList.add(`glow-${this.clickCount}`)
  }

  createClickParticles() {
    const container = document.querySelector(".container")
    const presentRect = this.present.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    // Create small burst of particles on click
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement("div")
      particle.classList.add("confetti")

      // Random confetti type
      const types = ["confetti-circle", "confetti-star", "confetti-diamond"]
      particle.classList.add(types[Math.floor(Math.random() * types.length)])

      const startX = presentRect.left - containerRect.left + presentRect.width / 2
      const startY = presentRect.top - containerRect.top + presentRect.height / 2

      particle.style.left = startX + "px"
      particle.style.top = startY + "px"

      const angle = (Math.PI * 2 * i) / 20
      const velocity = Math.random() * 80 + 40
      const deltaX = Math.cos(angle) * velocity
      const deltaY = Math.sin(angle) * velocity

      particle.style.animation = `confettiExplode 0.8s ease-out forwards`
      particle.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${Math.random() * 360}deg)`

      container.appendChild(particle)

      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle)
        }
      }, 800)
    }
  }

  finalExplosion() {
    // Stop shake animation
    this.present.classList.remove("animate-enticing-shake")

    // Start the final explosion sequence
    this.present.classList.add("animate-final-explosion")

    // Start white transition simultaneously
    this.whiteTransition.classList.add("animate-white-transition")

    // Show counter immediately when white transition starts (at 50% when screen is fully white)
    setTimeout(() => {
      this.startCounter()
    }, 1000) // 1 second = 50% of 2-second white transition

    // Create massive confetti explosion
    this.createConfettiExplosion()

    // Show robux after white transition
    setTimeout(() => {
      this.present.classList.add("hidden")
      this.showRobux()
    }, 2000)
  }

  createConfettiExplosion() {
    const container = document.querySelector(".container")
    const presentRect = this.present.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    const confettiTypes = [
      "confetti-rect",
      "confetti-circle",
      "confetti-triangle",
      "confetti-star",
      "confetti-diamond",
      "confetti-heart",
    ]

    // Create 120 pieces of confetti with realistic physics
    for (let i = 0; i < 120; i++) {
      const confetti = document.createElement("div")
      confetti.classList.add("confetti")
      confetti.classList.add(confettiTypes[Math.floor(Math.random() * confettiTypes.length)])

      const startX = presentRect.left - containerRect.left + presentRect.width / 2
      const startY = presentRect.top - containerRect.top + presentRect.height / 2

      confetti.style.left = startX + "px"
      confetti.style.top = startY + "px"

      // Realistic physics - explosion outward then gravity
      const angle = (Math.PI * 2 * i) / 120
      const velocity = Math.random() * 200 + 100
      const gravity = Math.random() * 300 + 200

      const deltaX = Math.cos(angle) * velocity
      const deltaY = Math.sin(angle) * velocity - gravity // Initial upward velocity

      // Create realistic arc motion with CSS
      const duration = Math.random() * 2 + 2
      const rotation = Math.random() * 1440 + 720 // Multiple spins

      confetti.style.animation = `confettiExplode ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`
      confetti.style.animationDelay = Math.random() * 0.2 + "s"

      // Apply physics transform
      confetti.animate(
        [
          {
            transform: `translate(0px, 0px) rotate(0deg)`,
            opacity: 1,
          },
          {
            transform: `translate(${deltaX * 0.7}px, ${deltaY * 0.7}px) rotate(${rotation * 0.7}deg)`,
            opacity: 1,
            offset: 0.3,
          },
          {
            transform: `translate(${deltaX}px, ${deltaY + gravity * 1.5}px) rotate(${rotation}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: duration * 1000,
          easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          fill: "forwards",
        },
      )

      container.appendChild(confetti)

      // Remove confetti after animation
      setTimeout(
        () => {
          if (confetti.parentNode) {
            confetti.parentNode.removeChild(confetti)
          }
        },
        (duration + 0.5) * 1000,
      )
    }
  }

  showRobux() {
    this.robux.classList.remove("hidden")

    // Add celebration pulsing effect
    setTimeout(() => {
      this.robux.classList.add("animate-celebration-pulse")
    }, 1500)
  }

  startCounter() {
    // Show counter with pop animation
    this.robuxCounter.classList.add("animate-counter-pop")

    // Start counting immediately after pop animation starts
    setTimeout(() => {
      this.animateCounter()
    }, 200)
  }

  animateCounter() {
    const targetValue = 30000
    const duration = 2500 // 2.5 seconds for satisfying count
    const startTime = Date.now()
    const startValue = 0

    const updateCounter = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Use easing function for satisfying acceleration
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart)

      // Format number with commas
      this.counterText.textContent = currentValue.toLocaleString()

      // Add pulse effect on significant milestones
      if (currentValue % 5000 === 0 && currentValue > 0) {
        this.counterText.classList.add("animate-number-pulse")
        setTimeout(() => {
          this.counterText.classList.remove("animate-number-pulse")
        }, 100)
      }

      if (progress < 1) {
        requestAnimationFrame(updateCounter)
      } else {
        // Final value reached - add extra emphasis
        this.counterText.textContent = targetValue.toLocaleString()
        this.counterText.classList.add("animate-number-pulse")
        setTimeout(() => {
          this.counterText.classList.remove("animate-number-pulse")
        }, 200)
      }
    }

    updateCounter()
  }
}

// Start the animation when page loads
window.addEventListener("load", () => {
  new PresentAnimation()
})
