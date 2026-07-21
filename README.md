# TITLE FIGHT — Jalon 5, étape 3

Moteur local déterministe d’un simulateur moderne et simplifié de boxe.

## Socle validé

- moteur de combat de trois rounds ;
- fatigue, dégâts tête/corps et stabilité ;
- chutes, compte, relèvement, KO et TKO ;
- trois juges et décisions officielles ;
- IA tactique adaptative déterministe ;
- catalogue de dix boxeurs fictifs couvrant les sept styles ;
- identité statistique de distance corrigée et validée.

## Matrice complète du roster

L’étape 3 simule les 45 affrontements uniques du roster avec 100 graines appariées par duel. Chaque graine est utilisée deux fois en inversant les coins.

- 45 duels ;
- 200 combats par duel ;
- 9 000 combats au total ;
- 900 apparitions par coin et par boxeur ;
- IA adaptative activée ;
- aucune calibration pendant la collecte.

## Résultat technique

- 108 tests automatisés réussis ;
- 180 répétitions déterministes, 0 écart ;
- 0 résultat officiel invalide ;
- 0 plan tactique manquant ou divergent ;
- 0 décision après KO ou TKO ;
- 0 empreinte historique Vega/Kessler modifiée ;
- part du coin rouge parmi les vainqueurs : 50,26 %.

## Diagnostic du roster

La matrice révèle un déséquilibre qui doit être traité à l’étape 4 :

- Darius Cole : 81,38 % de victoires hors nuls ;
- Idris Kane : 78,86 % ;
- Viktor Sokolov : 14,68 % ;
- Kenji Mori : 6,74 %.

L’étape 3 est donc validée sur l’intégrité technique et la reproductibilité, mais le roster n’est pas encore validé sur l’équilibre.

## Périmètre conservé

- boxeurs fictifs uniquement ;
- trois rounds maximum ;
- aucune interface Android ;
- aucun APK ;
- aucune dépendance réseau pendant la simulation.

## Exécuter la validation

```bash
./scripts/test-jalon5-step3.sh
```

## Jalon 5 — Étape 4

Le roster fictif de dix boxeurs est calibré sur une matrice de 9 000 combats. Les dix profils et les sept styles respectent leurs bandes compétitives, sans biais persistant du coin et sans modification du comportement historique Vega/Kessler en mode compatible. La prochaine étape est l’audit final multi-fenêtres avant toute maquette Android.

## Jalon 5 — Validation finale

Le roster calibré a passé un audit supplémentaire de dix fenêtres indépendantes et 4 500 combats, sans nouvelle modification des profils ou du moteur.

- 122 tests réussis au total ;
- 900 répétitions déterministes, 0 écart ;
- part rouge parmi les vainqueurs : 50,46 % ;
- dix boxeurs et sept styles dans leurs bandes compétitives ;
- identités statistiques stables ;
- aucun résultat invalide ni plan tactique divergent.

Le jalon 5 est validé. La maquette Android peut désormais être ouverte comme jalon séparé.

```bash
./scripts/test-jalon5-step5.sh
```

## Jalon 6 — Étape 2

La maquette visuelle statique de l’écran de combat est validée aux largeurs 320, 360 et 412 dp. Les fichiers se trouvent dans `ui-mockups/` et peuvent être régénérés par `scripts/render-jalon6-step2.sh`. Cette étape n’ajoute aucune dépendance Android, aucun composant Compose et aucune interaction moteur.

## Jalon 6 — Étape 3

Le module `android-ui-compose/` traduit la maquette statique en composants Jetpack Compose alimentés uniquement par `FightScreenState`. Les trois largeurs cibles, les règles de phase et les descriptions d’accessibilité sont centralisées dans un contrat pur Kotlin.

```bash
python3 scripts/test-jalon6-step3.py
./scripts/syntax-check-jalon6-step3.sh
```

Les commandes tactiques restent en lecture seule. La compilation Android et l’APK sont réservés à un environnement disposant du SDK Android, de Gradle et du plugin Compose.

## Jalon 6 — Étape 4

Les décisions tactiques sont désormais fonctionnelles entre les rounds. Une session interactive déterministe simule un round, ouvre une fenêtre de sélection, applique le plan validé au round suivant puis reprend le combat.

- rythme, distance, cible et risque modifiables ;
- sélection verrouillée pendant les rounds et après le résultat ;
- jeton de fenêtre empêchant une double confirmation ;
- aucun tirage consommé pendant l'édition du brouillon ;
- coin rouge ou bleu contrôlable ;
- contrôles Compose accessibles et écran défilable sur petite largeur ;
- timeline interactive identique au mapper complet une fois le combat terminé.

```bash
python3 scripts/test-jalon6-step4.py
./scripts/syntax-check-jalon6-step4.sh
```

Aucun APK n'est produit : le SDK Android, Gradle et le plugin Compose ne sont pas disponibles dans l'environnement actuel.

## Démonstration Android

Le projet Gradle complet se compose de `engine`, `android-ui-compose` et `app`.

Linux :

```bash
./scripts/bootstrap-android-sdk.sh
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
./scripts/build-android-demo.sh
./scripts/install-and-verify-apk.sh
```

Windows PowerShell :

```powershell
./scripts/bootstrap-android-sdk.ps1
./gradlew.bat :app:testDebugUnitTest :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Le script `gradlew` télécharge Gradle 9.5.1 et vérifie son SHA-256 avant exécution.

## Kit de compilation Windows autonome

Le fichier `BUILD_TITLE_FIGHT_WINDOWS.cmd` lance une procédure automatisée qui installe les prérequis disponibles, compile l’application, vérifie l’APK puis tente son installation et son lancement sur un téléphone connecté.

Guide complet : `COMPILATION_WINDOWS.md`.

La validation finale exige le statut `BUILD_INSTALL_LAUNCH_VERIFIED` dans `artifacts/windows-build/build-report.json`.
