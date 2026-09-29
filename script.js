const systems = {
  forge: {
    kicker: "Economy & progression",
    title: "Shop and blacksmith forge",
    description: "Built the equipment economy around buying, selling, repairing, salvaging, upgrading, and forging. Material compatibility, forging power, stability, fees, durability changes, and stat previews are resolved before the player commits.",
    points: ["Up to three selected forging materials", "Previewed before-and-after durability and effects", "Shared inventory updates across shop and blacksmith UI"]
  },
  durability: {
    kicker: "Persistent equipment state",
    title: "Durability with gameplay consequences",
    description: "Weapons wear down when heroes attack in watched and simulated battles. Battle rewards and shop stock can begin damaged, positive bonuses scale with condition, and broken gear remains unusable until repaired.",
    points: ["Condition survives purchasing and menu transitions", "Broken items automatically unequip", "Negative item effects remain meaningful at every condition"]
  },
  combat: {
    kicker: "Combat math",
    title: "Defense that stays useful",
    description: "Replaced raw Defense subtraction with proportional damage reduction. The same rule reads affected stats, includes equipment, clamps health correctly, and is used by both visible and background battle resolution.",
    points: ["Minimum one damage for positive attacks", "Equipment bonuses feed the same stat path", "Regression coverage for damage, wear, breakage, and repair"]
  },
  quests: {
    kicker: "Campaign structure",
    title: "Ordered quests inside a random board",
    description: "Extended the quest model with numbered story steps while preserving ordinary weighted contracts. Only the next story quest becomes eligible, and winning it advances the campaign sequence.",
    points: ["Story prerequisites coexist with random contracts", "The unlocked story quest receives a board slot", "Quest outcomes feed chronicles, reputation, and progression"]
  },
  guilds: {
    kicker: "Reactive world",
    title: "Rival guild simulation",
    description: "Rival guilds maintain influence, levels, rosters, completed quests, and recent activity. Their simulated victories, failures, recruitment, and casualties feed standings and newspaper reports.",
    points: ["Golden Banner, Iron Vow, and Hollow Crown identities", "Faction reputation from hated to revered", "Foundation for contested contracts and campaign consequences"]
  }
};

const codeExamples = {
  forge: {
    file: "ItemManager.cs",
    note: "Preview before committing",
    body: "The forge validates item compatibility and calculates the exact result before materials or gold are spent.",
    impact: "Players can understand the outcome of a permanent equipment decision before confirming it.",
    status: "Implemented and play-tested",
    code: `public ForgeUpgradePreview GetForgeUpgradePreview(
    ItemData item,
    List<CraftingMaterialData> materials
) {
    if (item == null || materials == null ||
        materials.Count == 0 || materials.Count > 3)
        return null;

    foreach (CraftingMaterialData material in materials) {
        if (material == null || !material.IsCompatibleWith(item.Type))
            return null;
    }

    List<StatusEffect> resultingEffects = CloneEffects(item.Effects);
    ApplyPositiveUpgradeBonus(
        resultingEffects,
        item.UpgradeEffectIncrease
    );

    return new ForgeUpgradePreview {
        Effects = resultingEffects,
        UpgradeLevel = GetUpgradeLevel(item) + 1,
        GoldCost = GetUpgradeCost(item)
    };
}`
  },
  durability: {
    file: "ItemManager.cs",
    note: "Persistent equipment condition",
    body: "Positive bonuses scale with the item's remaining durability, while harmful effects keep their full value.",
    impact: "Condition affects combat, broken weapons cannot be equipped, and repair becomes part of the economy loop.",
    status: "Implemented and tested in watched and background battles",
    code: `public float GetDurabilityMultiplier(ItemData item) {
    if (item == null)
        return 0f;

    int maximum = Mathf.Max(1, item.MaxDurability);
    return Mathf.Clamp01(GetCurrentDurability(item) / (float)maximum);
}

public float GetEffectiveEffectValue(ItemData item, StatusEffect effect) {
    if (effect == null)
        return 0f;

    return effect.Type == Effect.EffectType.Positive
        ? effect.Value * GetDurabilityMultiplier(item)
        : effect.Value;
}

public bool IsBrokenWeapon(ItemData item) {
    return item != null &&
           item.Type == ItemData.ItemType.Weapon &&
           GetCurrentDurability(item) <= 0;
}`
  },
  combat: {
    file: "Character.cs",
    note: "One shared defense rule",
    body: "A proportional curve keeps Defense valuable without allowing it to reduce every positive hit to zero.",
    impact: "The same calculation is used by interactive and simulated combat, including equipment bonuses.",
    status: "Implemented and regression-tested",
    code: `public const float DefenseScale = 20f;

public static int CalculateDamageAfterDefense(
    int damage,
    int defense
) {
    if (damage <= 0)
        return 0;

    float multiplier = DefenseScale /
        (DefenseScale + Mathf.Max(0, defense));

    return Mathf.Max(
        1,
        Mathf.RoundToInt(damage * multiplier)
    );
}`
  },
  quests: {
    file: "QuestManager.cs",
    note: "Ordered story steps",
    body: "Story quests unlock one step at a time while ordinary contracts continue to populate the same board.",
    impact: "The campaign can advance in a clear order without replacing the game's replayable quest selection.",
    status: "In progress — sequencing logic implemented; board protection is next",
    code: `private int completedStorySequenceStep = 0;

private bool IsQuestTemplateUnlocked(Quest template) {
    if (template == null)
        return false;

    if (!template.IsMainStoryQuest)
        return true;

    return template.StorySequenceStep ==
        completedStorySequenceStep + 1;
}

private void RecordStoryProgress(Quest quest, bool victory) {
    if (!victory || quest == null || !quest.IsMainStoryQuest)
        return;

    if (quest.StorySequenceStep == completedStorySequenceStep + 1)
        completedStorySequenceStep = quest.StorySequenceStep;
}`
  },
  guilds: {
    file: "RivalGuildManager.cs",
    note: "Quest outcomes change influence",
    body: "Victories and failures update the player's standing and record readable activity for the wider guild simulation.",
    impact: "Quest results feed rankings, rival pressure, roster information, and newspaper-style world feedback.",
    status: "Core simulation implemented; story interactions planned",
    code: `public void RecordPlayerQuest(
    Quest quest,
    bool victory,
    bool applyInfluence = true
) {
    int influenceChange = 0;

    if (applyInfluence) {
        int fullReward = Mathf.Max(1, quest.InfluenceReward);
        influenceChange = victory
            ? fullReward
            : -Mathf.RoundToInt(fullReward * (2f / 3f));
    }

    if (victory) {
        PlayerGuild.RecordCompletedQuest(
            influenceChange, activity, act, day
        );
    } else if (influenceChange != 0) {
        PlayerGuild.AddInfluence(influenceChange);
    }

    SyncPlayerRoster();
}`
  }
};

const tabs = document.querySelectorAll("[data-system]");
const kicker = document.querySelector("#system-kicker");
const title = document.querySelector("#system-title");
const description = document.querySelector("#system-description");
const points = document.querySelector("#system-points");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.setAttribute("aria-selected", "false"));
    tab.setAttribute("aria-selected", "true");
    const system = systems[tab.dataset.system];
    kicker.textContent = system.kicker;
    title.textContent = system.title;
    description.textContent = system.description;
    points.replaceChildren(...system.points.map((point) => {
      const item = document.createElement("li");
      item.textContent = point;
      return item;
    }));
  });
});

const codeTabs = document.querySelectorAll("[data-code]");
const codeSample = document.querySelector("#code-sample");
const codeFile = document.querySelector("#code-file");
const codeNoteTitle = document.querySelector("#code-note-title");
const codeNoteBody = document.querySelector("#code-note-body");
const codeImpact = document.querySelector("#code-impact");
const codeStatus = document.querySelector("#code-status");

function showCodeExample(key) {
  const example = codeExamples[key];
  codeFile.textContent = example.file;
  codeSample.textContent = example.code;
  codeNoteTitle.textContent = example.note;
  codeNoteBody.textContent = example.body;
  codeImpact.textContent = example.impact;
  codeStatus.textContent = example.status;
}

codeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    codeTabs.forEach((item) => item.setAttribute("aria-selected", "false"));
    tab.setAttribute("aria-selected", "true");
    showCodeExample(tab.dataset.code);
  });
});

showCodeExample("forge");

const dialog = document.querySelector("#image-dialog");
const dialogImage = dialog.querySelector("img");
document.querySelectorAll(".gallery-card").forEach((card) => {
  card.addEventListener("click", () => {
    dialogImage.src = card.dataset.image;
    dialogImage.alt = card.dataset.alt;
    dialog.showModal();
  });
});
dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

document.querySelector("#year").textContent = new Date().getFullYear();
