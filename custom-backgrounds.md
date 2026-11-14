# Arrière-plans sur votre déploiement

La statue jointe est incluse dans `public/` : le WebP original est conservé et le PNG est une conversion sans perte pour le moteur Satori de `@vercel/og`. Aucune connexion Firebase Storage n'est nécessaire pour cette image. Elle apparaît par défaut quand aucune image n'est enregistrée. Un arrière-plan existant garde ses réglages précédents.

Dans **Dashboard → Background Image**, choisissez la statue ou importez une image. Réglez l'opacité, la position, la taille, le cadrage et l'espace réservé à l'horloge (30 % par défaut pour la statue). Désactivez **Show background image** pour masquer l'image sans perdre vos réglages, puis enregistrez la configuration. Le préréglage statue utilise un fond noir uniforme ; les autres images gardent la couleur de fond configurée. Les points, leurs couleurs, les calculs, textes, statistiques et plugins restent au premier plan. Le Raccourci iPhone et son URL restent inchangés.

Les fonctionnalités d'arrière-plan sont gratuites pour tous les comptes sur ce déploiement, sans activation Pro. Les images PNG/JPG jusqu'à 500 Ko peuvent être enregistrées directement dans la configuration Firestore : cela évite Firebase Storage et laisse une marge sous la limite de 1 Mio par document. Le WebP importé est converti en PNG dans le navigateur avant cette limite. Les quotas et tarifs éventuels de Firebase et Vercel continuent de s'appliquer.

## Option Firebase Storage

Pour les images plus volumineuses, cochez **Use Firebase Storage**. Le client valide PNG/JPG/WebP et une limite de 5 Mio (après conversion WebP également). Chaque import crée un chemin unique `backgrounds/users/{uid}/{uuid}.{ext}` : un import raté ou une modification non enregistrée n'efface jamais l'image actuellement publiée. Les anciennes images restent dans le bucket et peuvent être nettoyées manuellement après vérification des configurations qui les utilisent.

Ce dépôt ne contenait aucune règle Storage/Firestore déployée. Les règles effectives et le plan de facturation de votre projet Firebase ne sont pas accessibles dans cet environnement ; ils n'ont pas été modifiés. Si Storage refuse un import, utilisez l'enregistrement direct ou vérifiez les règles de votre bucket. Voici une règle à **intégrer** aux règles existantes, sans remplacer les règles des autres chemins (cache et images administrateur notamment) :

```text
match /backgrounds/users/{uid}/{filename} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow create, update: if request.auth != null && request.auth.uid == uid
    && request.resource.size <= 5 * 1024 * 1024
    && request.resource.contentType.matches('image/(jpeg|png|webp)');
  allow delete: if request.auth != null && request.auth.uid == uid;
}
```

`getDownloadURL` fournit une URL à jeton utilisable par le générateur côté serveur : ne révoquez pas ce jeton tant que l'image est utilisée. Le document `configs/{username}` doit rester lisible par le mécanisme serveur existant, et modifiable uniquement par son propriétaire selon vos règles actuelles. Les images enregistrées directement dans ce document sont donc lisibles par les mêmes lecteurs que la configuration ; utilisez uniquement des images destinées à être partagées.

La clé de cache prend maintenant en compte les propriétés imbriquées et une version du moteur. Un changement d'image ou de réglage, ainsi que le changement quotidien de date, produit une autre clé. Les URL et en-têtes HTTP existants sont conservés. L'API anonyme `/api/wallpaper` reste inchangée.

## Vérifications

```sh
node tests/background.cjs
npx tsc --noEmit
npm run build
```

Les tests couvrent le cache et les quatre dispositions (vie, mois, jours continus, calendrier), avec rendu PNG réel. Sur le déploiement Vercel de la branche, vérifiez également l'import et l'enregistrement avec votre compte Firebase, puis l'URL `/api/votre-nom` deux fois (MISS puis HIT si le cache Storage est configuré).
