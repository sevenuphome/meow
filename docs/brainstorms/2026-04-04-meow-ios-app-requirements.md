---
date: 2026-04-04
topic: meow-ios-app
status: active
---

# Meow - Cat Brain AI Mobile App

## Problem Frame

Cat Brain AI currently exists as a web game (GitHub Pages) with ML-driven cat behavior. The goal is to transform it into a serious, commercial-quality mobile app for iOS and Android App Stores, with beautiful 2D cartoon art, smooth animations, and IAP monetization. The current web version serves as a working prototype of the core game logic.

## Requirements

### v1.0 - Core + Art + IAP

**Core Gameplay (port from web prototype)**
- R1. Two default cats (Som and Tao) with distinct personalities (boldness, affection, appetite) living in a room
- R2. Cat AI brain: DQN neural network for decision-making with rule-based fallback, running on-device
- R3. Cat state system: hunger, energy, happiness, curiosity, bond, stress, trust, comfort - decaying/changing over time
- R4. 9 mood system derived from states: happy, playful, content, sleepy, hungry, annoyed, curious, scared, relaxed
- R5. User actions: feed, pet, play, talk, wait - each affecting cat states based on personality
- R6. Auto-care (maid) feature: hire a caretaker character who automatically tends to cats based on urgency scoring
- R7. Time-of-day system affecting cat behavior (dawn, morning, afternoon, evening, night, late night)
- R8. Cat-to-cat interaction: second cat reacts to first cat's actions

**Visual & Animation**
- R9. 2D illustration/cartoon art style (reference: Neko Atsume, Kleptocats) - professional quality sprites for cats, room, items, maid character
- R10. Smooth sprite-based animations: cats walking, eating, sleeping, playing, hissing, purring, exploring - each mood should have distinct visual expression
- R11. Room environment with interactive landmarks: food bowl area, bed area, window, owner position - visually rich and detailed
- R12. Maid character with walking animation, contextual tool, and speech bubbles when auto-care is active

**Monetization (IAP)**
- R13. Unlock new cat breeds/skins (different colors, patterns, breeds) via IAP
- R14. Room themes and decorations purchasable via IAP (furniture, wallpaper, toys, seasonal items)
- R15. Cat accessories/costumes (hats, collars, outfits) via IAP
- R16. In-game currency earned through play + purchasable for faster unlocks

**Platform & Infrastructure**
- R17. Local save/load game state (persistent between sessions)
- R18. Push notifications: remind player when cats are hungry, lonely, or need attention
- R19. i18n support: Thai, English, Korean (existing translations as base)
- R20. Offline-first: fully playable without internet connection

### v1.1 - Mini-games (future)
- R21. Interactive mini-games (catch fish, chase yarn, laser pointer) that earn rewards/currency
- R22. Mini-game results affect cat happiness and bond

### v1.2 - Social (future)
- R23. Visit friends' cats and rooms
- R24. Share cat screenshots/moments
- R25. Leaderboard (happiest cat, most decorated room)

## Success Criteria

- Accepted on both iOS App Store and Google Play Store
- App feels native and polished (not a web wrapper) - smooth 60fps animations
- At least 3 purchasable cat skins and 2 room themes at launch
- Core gameplay loop is engaging: player returns daily to care for cats
- DQN inference runs smoothly on-device without lag
- App size under 100MB at launch

## Scope Boundaries

- v1.0 does NOT include social features (v1.2)
- v1.0 does NOT include mini-games (v1.1)
- No server/backend for v1.0 - fully offline, local storage only
- No user accounts or cloud sync in v1.0
- No real-time multiplayer
- Art assets: will need to source or commission 2D illustration art (not generated with CSS)

## Key Decisions

- **Unity 2D over Flutter/Flame**: Prioritizing animation quality and professional game tooling. Unity's Animator, Spine integration, and Asset Store provide best-in-class 2D game development despite C# learning curve.
- **Free + IAP over Ads**: Cleaner user experience. Cosmetic-only IAP (cats, rooms, accessories) - no pay-to-win mechanics.
- **Phased release**: v1.0 core + art + IAP, v1.1 mini-games, v1.2 social. Reduces time-to-market and validates core gameplay first.
- **Offline-first**: No backend required for v1.0. Simplifies architecture and reduces ongoing costs.
- **AI art + manual touch-up**: Use AI tools (Midjourney, Stable Diffusion) to generate base art, then post-process in image editor to create consistent sprite sheets. Cost-effective, full creative control, requires post-processing effort for consistency.

## Dependencies / Assumptions

- Apple Developer Program membership ($99/year) required for App Store
- Google Play Developer account ($25 one-time) required for Play Store
- Art pipeline: AI-generated concepts → post-process in Photoshop/Aseprite → sprite sheets for Unity
- DQN model needs to be converted to Unity-compatible format (ONNX via Barracuda/Sentis)
- User has Mac for iOS builds (Xcode required)

## Outstanding Questions

### Deferred to Planning
- [Affects R2][Needs research] Best approach for running DQN inference in Unity: Unity Sentis (formerly Barracuda) vs custom C# implementation of forward pass
- [Affects R16][Technical] In-game currency balance design: earn rates, IAP prices, unlock costs
- [Affects R17][Technical] Save system architecture: PlayerPrefs vs JSON serialization vs ScriptableObjects
- [Affects R18][Needs research] Push notification implementation for both iOS and Android in Unity (Firebase Cloud Messaging vs Unity Mobile Notifications)
- [Affects R13-R15][Technical] IAP catalog structure and Unity IAP SDK integration

## Next Steps
-> `/ce:plan` for structured implementation planning
