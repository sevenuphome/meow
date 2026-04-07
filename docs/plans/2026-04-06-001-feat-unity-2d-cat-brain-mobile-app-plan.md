---
title: "feat: Unity 2D Cat Brain AI Mobile App (v1.0)"
type: feat
status: active
date: 2026-04-06
origin: docs/brainstorms/2026-04-04-meow-ios-app-requirements.md
---

# feat: Unity 2D Cat Brain AI Mobile App (v1.0)

## Overview

Port the Cat Brain AI web game into a commercial-quality Unity 2D mobile app for iOS and Android. The app features ML-driven virtual cats with personality-based behavior, beautiful 2D cartoon art with Spine animation, cosmetic IAP monetization, and full i18n support (Thai/English/Korean). The existing web prototype at `sevenuphome.github.io/meow/` serves as the functional specification — all game logic, state systems, and AI behavior have been validated there.

## Problem Statement / Motivation

The current web game demonstrates a working concept: virtual cats powered by a DQN neural network that learn behavior patterns based on personality traits and player interaction. However, a web page cannot:
- Be discovered on App Store / Play Store
- Send push notifications to re-engage players
- Monetize through cosmetic IAP
- Deliver the visual polish (Spine animation, sound effects) expected of a commercial pet game
- Persist meaningful long-term player relationships with their cats

The mobile app transforms a prototype into a product that can compete with Neko Atsume, Kleptocats, and similar titles in the casual pet game category.

## Proposed Solution

Build a Unity 2D app using MonoBehaviour + ScriptableObject architecture. Port all game logic from JavaScript to C#. Use Spine Professional for character animation (enabling IAP skin swapping). Implement a custom C# DQN forward pass (skip Sentis — model is only 5,514 parameters). Monetize via cosmetic-only IAP using Unity IAP 5.0+.

## Technical Approach

### Architecture

```
MeowApp/
  Assets/
    _Project/
      Scripts/
        Core/           -- GameManager, SaveManager, TimeManager, OfflineSimulator
        Pet/            -- CatState, CatController, CatStateMachine, Personality (SO)
        AI/             -- DQNBrain, RuleBrain, BrainWeights (SO), AutoCareMaid
        UI/             -- UIManager, ShopPanel, SettingsPanel, OnboardingFlow
        IAP/            -- StoreManager, ProductCatalog (SO), ReceiptValidator
        Notifications/  -- NotificationScheduler, NotificationConfig (SO)
        Localization/   -- LocaleManager (wraps com.unity.localization)
        Audio/          -- AudioManager, SFXCatalog (SO)
      Art/
        Spine/          -- Cat skeletons, maid skeleton
        Sprites/        -- Room backgrounds, items, UI elements
        Fonts/          -- NotoSansThai, NotoSansKR, NotoSans (English)
      Animations/       -- Unity Animator controllers for UI
      Data/             -- ScriptableObject assets (cat configs, item catalog, prices)
      Prefabs/          -- Room prefab, cat prefab, maid prefab, UI prefabs
      Localization/     -- String tables (UI, actions, reactions, maid speech)
      Audio/            -- SFX and ambient audio clips
```

**Single-scene architecture** — one Unity scene with UI panels toggled on/off. No scene transitions needed for a virtual pet game.

**Key patterns:**
- **ScriptableObjects** for all data (cat configs, item catalog, brain weights, notification configs)
- **C# events** for observer pattern (state changes → UI updates, audio triggers, animation changes)
- **Enum-based State Machine** for cat behavior states (Idle, Eating, Sleeping, Playing, Reacting, Walking)
- **Delta-time tick** for state decay (matching web prototype pattern)

### Implementation Phases

#### Phase 1: Project Foundation & Core Game Loop

**Goal:** Playable prototype with programmer art — two cats in a room, all 6 actions work, states update, moods display.

**Tasks:**

1. **Unity project setup**
   - Create Unity 2D project (Unity 6 LTS)
   - Install packages: `com.unity.localization`, `com.unity.mobile.notifications`, `com.unity.purchasing`, `com.unity.2d.animation`, `com.unity.nuget.newtonsoft-json`
   - Configure build targets: iOS + Android
   - Set up Git repo with proper .gitignore for Unity
   - `ProjectSettings/`, `Packages/`

2. **Port CatState to C#** — `Scripts/Pet/CatState.cs`
   - 8 dynamic float fields (hunger, energy, happiness, curiosity, bond, stress, trust, comfort)
   - 3 personality floats (boldness, affection, appetite) from ScriptableObject config
   - `Tick(float deltaSeconds)` with time-of-day multipliers (6 periods)
   - `ApplyAction(ActionType action)` with personality modulation + noise
   - Over-petting stress mechanic (>4 interactions in 60s)
   - Trust building from positive low-stress interactions
   - `GetMood()` priority chain → 9 moods
   - All decay rates, thresholds, and formulas ported exactly from `/Users/up/Projects/meow/index.html` lines 963-1107

   ```csharp
   // Key constants (from web prototype)
   const float HUNGER_RATE = 0.002f;
   const float ENERGY_DECAY = 0.001f;
   const float CURIOSITY_RATE = 0.0015f;
   const float HAPPINESS_DECAY = 0.0005f;
   const float BOND_DECAY = 0.0001f;
   const float STRESS_DECAY = 0.0008f;
   const float TRUST_DECAY = 0.00005f;
   const float COMFORT_DECAY = 0.0003f;
   ```

3. **Port DQN Brain to C#** — `Scripts/AI/DQNBrain.cs`
   - Custom forward pass (~80 lines): `float[] Forward(float[] input12)`
   - Architecture: Linear(12→64)+ReLU → Linear(64→64)+ReLU → Linear(64→10)
   - 5,514 weights stored in `BrainWeights` ScriptableObject (imported from `/tmp/cat_weights.json`)
   - Epsilon-greedy action selection (10% random)
   - Input vector: 8 states + 3 personality + 1 encoded action (feed=0.2, pet=0.4, play=0.6, talk=0.8, none=0.0)
   - Output: 10 Q-values → argmax selects cat action

   ```csharp
   // Forward pass core
   float[] layer1 = MatMulAddReLU(input, w0, b0);  // 12→64
   float[] layer2 = MatMulAddReLU(layer1, w2, b2);  // 64→64
   float[] output  = MatMulAdd(layer2, w4, b4);      // 64→10
   return output; // Q-values for 10 cat actions
   ```

4. **Port Rule Brain** — `Scripts/AI/RuleBrain.cs`
   - Fallback when DQN unavailable or for debugging
   - `DecideCatReaction()` decision tree for cat-to-cat interaction
   - Autonomous action logic for idle cats

5. **Port Auto-Care Maid** — `Scripts/AI/AutoCareMaid.cs`
   - Urgency scoring: `hunger*3 + (1-energy)*1.5 + (1-happiness)*2 + stress*2.5 + (1-trust)*1`
   - Priority decision tree (11 rules from web prototype)
   - 4-second action interval

6. **Cat Controller** — `Scripts/Pet/CatController.cs`
   - MonoBehaviour managing a single cat's lifecycle
   - State machine: Idle → action states → back to Idle
   - Position/movement system (percentage-based room coords, lerp movement)
   - Landmarks: FOOD_POS(12,68), BED_POS(85,25), OWNER_POS(50,85)

7. **GameManager** — `Scripts/Core/GameManager.cs`
   - Singleton managing game state, two CatControllers
   - Action dispatch: user taps button → selected cat performs action → second cat reacts
   - Tick loop: state decay every frame via deltaTime
   - Selected cat tracking

8. **Basic UI** (placeholder) — `Scripts/UI/UIManager.cs`
   - Stat bars for all 8 states
   - 6 action buttons (feed, pet, play, talk, sleep, explore)
   - Mood display with emoji
   - Cat selection
   - Placeholder room with colored rectangles

**Success criteria:** Both cats respond to all 6 user actions with correct state changes. DQN brain selects cat actions. Moods change based on state thresholds. Second cat reacts. Time-of-day multipliers active.

**Estimated effort:** 2-3 weeks

---

#### Phase 2: Visual Polish & Animation

**Goal:** Replace programmer art with beautiful 2D cartoon art. Cats come alive with Spine animation.

**Tasks:**

1. **Art asset creation pipeline**
   - Generate cat character concepts with AI (Midjourney/Stable Diffusion)
   - Create character pieces for Spine: head, body, tail, 4 legs, ears (separate layers)
   - Clean up in Photoshop/Krita: consistent line weight, color palette
   - Generate room backgrounds (multiple themes) with AI, clean up
   - Create item sprites (food bowl, bed, toys, decorations)
   - `Art/Spine/`, `Art/Sprites/`

2. **Spine character setup** (Spine Professional $369 one-time)
   - Rig cat skeleton with bones (spine, head, tail, 4 legs, ears, eyes)
   - Create animation clips per cat action:
     - Idle (breathing, tail sway, ear twitch)
     - Walk (walk cycle, head bob)
     - Eat (head down to bowl, chewing)
     - Sleep (curled up, breathing, zzz)
     - Play (pounce, bat at toy)
     - Purr (body vibration, half-closed eyes)
     - Hiss (arched back, wide eyes)
     - Rub (against owner leg)
     - Meow (open mouth, head tilt)
     - Stare (wide eyes, still body, tail tip flick)
     - Explore (sniffing, looking around)
   - **Skin system** for IAP costumes: slot attachments for hat, collar, outfit
   - Import via spine-unity runtime package
   - `Art/Spine/cat_orange.spine`, `Art/Spine/cat_gray.spine`

3. **Spine maid character**
   - Rig with walk animation, sweeping arm, idle stance
   - Tool swap (change hand attachment: food bowl, hand, yarn, speech bubble)
   - Speech bubble above head

4. **Room visual system** — `Scripts/Core/RoomManager.cs`
   - Parallax background layers (wall, floor, window with daylight)
   - Time-of-day lighting: dawn (warm orange), morning (bright), afternoon (golden), evening (purple), night (blue), late_night (dark blue with stars)
   - Room decoration placement system (for IAP items)
   - Interactive landmarks with visual indicators

5. **UI polish**
   - Designed stat cards with icons
   - Smooth bar animations (lerp fill)
   - Mood transition effects
   - Action button feedback (press animation, disable during cooldown)
   - Cat name tags

6. **Audio system** — `Scripts/Audio/AudioManager.cs`
   - SFX per cat action: meow, purr, hiss, eating crunch, yawn, playful chirp
   - Ambient room sounds (clock ticking, birds outside window for daytime)
   - Background music (calm lo-fi loop, quieter at night)
   - Volume controls in settings
   - Audio ducking during speech bubbles

**Success criteria:** Cats animate smoothly at 60fps. Each mood has visually distinct expression. Room changes appearance with time of day. Audio enhances the experience.

**Estimated effort:** 3-4 weeks (art creation is the bottleneck)

---

#### Phase 3: Persistence, Notifications & Offline

**Goal:** Game state persists. Cats "live" even when the app is closed. Smart notifications bring the player back.

**Tasks:**

1. **Save system** — `Scripts/Core/SaveManager.cs`
   - Save data structure:
     ```csharp
     [Serializable]
     public class SaveData {
         public int saveVersion;
         public long lastPlayedTimestamp;
         public CatSaveData[] cats;        // states, personality, equipped cosmetics
         public List<string> ownedItems;   // purchased item IDs
         public int currency;              // in-game coins
         public string language;           // th/en/ko
         public SettingsData settings;     // volume, notifications toggle
         public bool maidUnlocked;
         public MaidSaveData maid;         // active state, cooldown
     }
     ```
   - JSON serialization via Newtonsoft JSON
   - AES-128 encryption (deter casual tampering)
   - File: `Application.persistentDataPath + "/save.dat"`
   - Auto-save triggers: every action, on `OnApplicationPause(true)`, on `OnApplicationQuit()`
   - Save versioning with migration functions (v1→v2 adds new fields with defaults)
   - Corrupted save recovery: try decrypt → if fail, backup corrupted file, start fresh with warning

2. **Offline time simulation** — `Scripts/Core/OfflineSimulator.cs`
   - On app resume, calculate elapsed seconds since `lastPlayedTimestamp`
   - **Cap simulated time at 2 hours** (prevent morning-punishment syndrome)
   - Apply 50% reduced decay rate during offline simulation
   - If maid was active: simulate maid auto-care actions every 60s of simulated time
   - Show "While You Were Away" summary screen:
     - Time elapsed
     - Cat state changes (before → after)
     - Maid actions performed (if active)
   - Edge case: device clock manipulation → validate against monotonic clock or last known timestamp

3. **Notification scheduling** — `Scripts/Notifications/NotificationScheduler.cs`
   - Use `com.unity.mobile.notifications` (local notifications only)
   - Schedule on app background based on predicted state:
     - Predict when hunger > 0.8 → schedule "Som is hungry!" notification
     - Predict when energy < 0.15 → schedule "Tao is exhausted"
     - Generic "Your cats miss you" after 6 hours of no play
   - **Rules:** max 3 notifications/day, minimum 4-hour gap, quiet hours 22:00-08:00
   - Cancel all pending notifications on app resume, reschedule on background
   - Localized notification text (TH/EN/KO)
   - Notification settings: toggle per type in Settings panel
   - Deep link: tapping notification opens app (no specific screen navigation needed for v1.0)

**Success criteria:** Game state survives app kill and device restart. Cats are in reasonable state after overnight closure. Notifications fire at appropriate times.

**Estimated effort:** 1-2 weeks

---

#### Phase 4: Shop & IAP

**Goal:** Players can buy cosmetic items with real money or in-game currency. Apple/Google review-ready.

**Tasks:**

1. **In-game currency system** — `Scripts/IAP/CurrencyManager.cs`
   - Currency name: "Fish" (🐟)
   - Earn rates: +5 per feed, +3 per pet, +5 per play, +2 per talk, +1 per explore, +0 per sleep
   - Daily earning cap: 200 Fish (prevents grind abuse)
   - Cap resets at midnight local time

2. **IAP product catalog** — `Scripts/IAP/ProductCatalog.cs` (ScriptableObject)
   - **Non-consumable:** cat skins, room themes, accessories (buy once, own forever)
   - **Consumable:** Fish currency packs
   - Price tiers:
     - Single cat skin: 500 Fish or $1.99
     - Room theme: 800 Fish or $2.99
     - Accessory pack (3 items): 300 Fish or $0.99
     - 500 Fish: $0.99
     - 1500 Fish: $2.49
     - 5000 Fish: $6.99
   - At launch: 3 cat skins, 2 room themes, 3 accessory sets (see origin: docs/brainstorms/2026-04-04-meow-ios-app-requirements.md)

3. **Shop UI** — `Scripts/UI/ShopPanel.cs`
   - Tab navigation: Cats | Rooms | Accessories | Fish
   - Item cards: preview image, name, price (Fish + real money option)
   - Cat skin preview: show selected skin on cat model before purchase
   - Purchase confirmation dialog
   - "Owned" badge on purchased items
   - Equip button for owned items

4. **Unity IAP integration** — `Scripts/IAP/StoreManager.cs`
   - Unity IAP 5.0+ with async/event pattern
   - `CrossPlatformValidator` for local receipt validation
   - **Restore Purchases button** in Settings (Apple requirement)
   - IAP entitlements stored in save file AND verified against receipts on launch
   - Handle purchase states: pending, confirmed, failed, deferred (Ask to Buy)
   - Keychain (iOS) / backed-up SharedPreferences (Android) as backup entitlement store for reinstall recovery

5. **Cosmetic application system**
   - Cat skin: swap Spine skin attachments at runtime
   - Room theme: swap background sprite set + decoration positions
   - Accessories: add Spine slot attachments (hat, collar, outfit slots)

**Success criteria:** Can purchase items with Fish or real money. Restore Purchases works after reinstall. All IAP products validated by Apple/Google sandbox testing.

**Estimated effort:** 2-3 weeks

---

#### Phase 5: Localization, Onboarding & Polish

**Goal:** Full i18n, smooth first-time experience, and App Store readiness.

**Tasks:**

1. **Localization** — using `com.unity.localization`
   - 3 locales: en (default), th, ko
   - String Tables:
     - UI_Strings: stat labels, buttons, menus, settings
     - Action_Strings: 10 cat action texts × 3 variants each × 3 languages
     - Reaction_Strings: 10 reaction texts × 2 variants each × 3 languages
     - Maid_Strings: 7 maid speech texts × 3 languages
     - Notification_Strings: notification templates × 3 languages
   - Existing translations from web prototype as base
   - Font setup: TextMeshPro SDF fonts
     - Primary: Noto Sans (English/Latin)
     - Fallback 1: Noto Sans Thai
     - Fallback 2: Noto Sans KR (Korean)
   - Runtime locale switching via Settings panel, persisted in save data
   - Flexible UI layouts with `ContentSizeFitter` for string length variance

2. **Onboarding flow** — `Scripts/UI/OnboardingFlow.cs`
   - Screen 1: "Welcome to Meow!" — brief intro, app logo
   - Screen 2: Meet Som and Tao — cats appear with greeting speech bubble
   - Screen 3: Quick tutorial — highlight action buttons, explain one action (feed)
   - Screen 4: "They're all yours!" — dismiss into main game
   - Skip button available
   - Only shown on first launch (flag in save data)
   - Optional: rename cats (text input with Thai/English/Korean keyboard support)

3. **Settings panel** — `Scripts/UI/SettingsPanel.cs`
   - Language selector (TH/EN/KO flags)
   - Sound: music volume, SFX volume
   - Notifications: toggle on/off, quiet hours
   - Restore Purchases button
   - Credits / About
   - Privacy Policy link

4. **App Store preparation**
   - Privacy Policy page (hosted on GitHub Pages alongside web game)
   - Age rating: 4+ (no violence, IAP disclosed)
   - App Store screenshots (5 per device size per language = up to 30 screenshots)
   - App icon: cat face illustration matching art style
   - App description in 3 languages
   - No analytics/tracking SDK in v1.0 → "No data collected" privacy label
   - No ATT prompt needed (no tracking)

5. **Final polish**
   - Loading screen with cat illustration
   - App icon + splash screen
   - Haptic feedback on action buttons (light impact)
   - Reduced motion mode (disable cat walking animation, keep static poses)
   - Error handling for all edge cases (corrupted save, IAP failure, notification permission denied)

**Success criteria:** App runs in all 3 languages. New users understand the game within 60 seconds. App meets all App Store / Play Store submission requirements.

**Estimated effort:** 2-3 weeks

---

#### Phase 6: Testing & Launch

**Tasks:**

1. **Device testing**
   - iPhone SE (small screen), iPhone 15 Pro Max, iPad
   - Android mid-range (Samsung Galaxy A series), Android tablet
   - Test all 3 languages on all devices
   - Performance profiling: target 60fps, <150MB RAM

2. **IAP testing**
   - Apple sandbox accounts
   - Google Play test tracks
   - Purchase → restore → reinstall → restore flow
   - Failed purchase recovery
   - Refund handling

3. **Gameplay testing**
   - 24-hour play session: verify offline simulation works correctly
   - Extreme neglect test: close app for 1 week, verify recovery
   - Notification accuracy: verify timing matches predictions
   - Save corruption test: manually corrupt save file, verify recovery
   - Clock manipulation test: set device time forward/backward

4. **App Store submission**
   - Build signed IPA (iOS) and AAB (Android)
   - Submit to TestFlight / Google Play Internal Testing
   - Beta test with 5-10 users
   - Address feedback
   - Submit for review

**Success criteria:** 0 crashes in 48-hour soak test. All IAP flows verified. App approved on both stores.

**Estimated effort:** 1-2 weeks

---

## Design Decisions (carried from origin)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Engine | Unity 2D | Best animation tools, Asset Store, C# learning opportunity (see origin) |
| ML Inference | Custom C# forward pass | Model is only 5,514 params; Sentis adds 5-15MB overhead for no benefit |
| Animation | Spine Professional ($369) | Skin system enables IAP costume swapping; smooth skeletal animation |
| Monetization | Free + cosmetic IAP | Clean UX, no pay-to-win, simpler review process (see origin) |
| Save system | JSON + AES at persistentDataPath | Simple, offline-compatible, version-migratable |
| Notifications | Unity Mobile Notifications (local) | No server needed; covers 90% of use cases for pet games |
| Offline time | Cap at 2h simulated, 50% reduced decay | Prevents morning-punishment; keeps cats recoverable |
| Cat death | No death mechanic | Matches Neko Atsume reference; keeps game positive and welcoming |
| Action set | 6 actions: feed, pet, play, talk, sleep, explore | Full set from prototype; "wait" replaced by passive idle |
| Maid | Free toggle with 1-hour sessions, purchasable extensions (IAP) | Low barrier to try; monetizable for convenience |
| Art pipeline | AI-generated → human-refined → Spine/TexturePacker | Cost-effective, full creative control (see origin) |

## System-Wide Impact

### Interaction Graph

User tap → UIManager → GameManager.DoAction() → CatState.ApplyAction() → triggers C# events → AnimationController updates Spine state, AudioManager plays SFX, UIManager updates bars → DQNBrain.Forward() selects cat response → CatController plays response animation → RuleBrain.DecideCatReaction() fires for second cat → second CatController reacts → SaveManager.AutoSave()

### Error & Failure Propagation

- DQN inference failure → fallback to RuleBrain (silent, logged)
- Save file corruption → backup + fresh start with warning dialog
- IAP purchase failure → error dialog, no state change, retry option
- Notification permission denied → game works without notifications, Settings shows "enable in device settings"

### State Lifecycle Risks

- **App killed during save:** Use atomic write (write to temp file, rename on success)
- **IAP confirmed but save fails:** Store IAP entitlements in Keychain/SharedPreferences as backup
- **Offline simulation overflow:** Cap at 2 hours prevents extreme state values
- **Save version mismatch:** Migration functions add defaults for new fields; never delete fields in v1.x

## Acceptance Criteria

### Functional Requirements

- [ ] Two cats with distinct personalities respond to 6 user actions
- [ ] DQN brain selects cat actions with 10% exploration
- [ ] 9 moods display correctly based on state thresholds
- [ ] Time-of-day affects decay rates (6 periods)
- [ ] Auto-care maid performs urgency-based care
- [ ] Cat-to-cat reaction on every user action
- [ ] Spine animations for all 10 cat actions + idle
- [ ] Room changes appearance with time of day
- [ ] Sound effects for all actions and ambient audio
- [ ] 3 cat skins, 2 room themes, 3 accessory sets purchasable
- [ ] In-game currency (Fish) earned through play, daily cap 200
- [ ] IAP purchase and restore flow works on both platforms
- [ ] Game state persists through app kill and device restart
- [ ] Offline time simulated correctly (capped at 2h, 50% decay)
- [ ] Push notifications fire at predicted thresholds (max 3/day)
- [ ] Full i18n: Thai, English, Korean
- [ ] Onboarding flow for first-time users
- [ ] Settings: language, audio, notifications, restore purchases

### Non-Functional Requirements

- [ ] 60fps on iPhone SE (2020) and equivalent Android
- [ ] App size < 100MB at launch
- [ ] RAM usage < 150MB
- [ ] DQN inference < 1ms per call
- [ ] Cold start < 3 seconds
- [ ] Save/load < 100ms

### Quality Gates

- [ ] 0 crashes in 48-hour soak test
- [ ] All IAP flows verified in sandbox
- [ ] All 3 languages reviewed by native speakers
- [ ] Privacy policy published and linked
- [ ] Age rating: 4+
- [ ] App Store screenshots for all device sizes

## Dependencies & Prerequisites

| Dependency | Cost | Notes |
|------------|------|-------|
| Apple Developer Program | $99/year | Required for App Store |
| Google Play Developer | $25 one-time | Required for Play Store |
| Spine Professional | $369 one-time | Lifetime license with updates |
| Unity 6 LTS | Free (Personal) or $399/year (Pro) | Personal is free if revenue < $200K |
| Mac with Xcode | Required | For iOS builds |
| TexturePacker | $40 one-time | Sprite sheet packing |
| AI art tool | ~$10-30/month | Midjourney or Stable Diffusion |

**Total estimated upfront cost:** ~$540-$570

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| C# / Unity learning curve | High | Medium | Start with Phase 1 (pure logic, no art). Follow Unity Learn tutorials. |
| Art consistency from AI | Medium | High | Establish strict style guide. Generate many variants, curate best. Human-refine hero character. |
| App Store rejection | Low | High | Follow all guidelines. Include privacy policy, restore purchases, proper age rating. |
| DQN behavior mismatch | Medium | Medium | Verify observation space matches training exactly. Test with known inputs. |
| Spine animation complexity | Medium | Medium | Start simple (idle + walk), add actions iteratively. |
| IAP receipt validation | Low | High | Use Apple StoreKit 2 local validation + Keychain backup. Test exhaustively. |
| Save migration bugs | Low | High | Version all saves. Never delete fields. Comprehensive migration tests. |

## Outstanding Questions (Deferred from Origin)

- [Affects R16][Technical] In-game currency balance fine-tuning: earn rates and prices in this plan are initial estimates. Needs playtesting to validate economy feels fair.
- [Affects R2][Needs research] Training/runtime parameter drift: the `CatEnv` training environment uses step-based time vs real-time `tick()`. Verify observation normalization matches or retrain with real-time parameters.
- [Affects R8][Technical] Cat-to-cat interaction depth for v1.1+: independent cat-cat relationships (bonding, conflict) beyond reactive system. Defer to post-v1.0.

## Future Considerations (v1.1 / v1.2)

- **v1.1 Mini-games:** Catch fish, chase yarn, laser pointer. Earn bonus Fish currency. Affects happiness/bond.
- **v1.2 Social:** Visit friends' cats (requires backend), share screenshots, leaderboard.
- **v1.3+:** Cloud save sync, more languages, seasonal events, live cat breeding.

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-04-04-meow-ios-app-requirements.md](docs/brainstorms/2026-04-04-meow-ios-app-requirements.md) — Key decisions carried forward: Unity 2D engine, Free + IAP monetization, phased release (v1.0/1.1/1.2), AI art pipeline, offline-first architecture.

### Internal References

- Web prototype (port source): `/Users/up/Projects/meow/index.html`
- CatState logic: `/Users/up/Projects/meow/index.html:963-1107`
- DQN forward pass: `/Users/up/Projects/meow/index.html:908-946`
- Brain weights: `/tmp/cat_weights.json` (5,514 parameters)
- Auto-care system: `/Users/up/Projects/meow/index.html:1680-1776`
- Python training code: `/Users/up/Projects/machinelearning/src/cat_env.py`
- Original state system: `/Users/up/Projects/machinelearning/src/cat_state.py`

### External References

- Unity Sentis docs: https://docs.unity3d.com/Packages/com.unity.ai.inference@2.4/manual/
- Unity IAP 5.0: https://docs.unity.com/ugs/en-us/manual/iap/manual/overview
- Unity Localization: https://docs.unity3d.com/6000.1/Documentation/Manual/com.unity.localization.html
- Unity Mobile Notifications: https://docs.unity3d.com/Packages/com.unity.mobile.notifications@2.4/
- Spine Unity Runtime: http://esotericsoftware.com/spine-unity
- Apple App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play Policy: https://play.google.com/about/developer-content-policy/
