from pathlib import Path
import json, re, shutil

root = Path('naim-book-android')
project = root / 'buildsrc-v11' / 'Naim_Mondes_Impossibles_Android'
if not project.exists():
    raise SystemExit('Run v1.1 + v1.2 + v1.5 + v1.6 scripts first')
assets = project / 'app/src/main/assets'
indexp = assets / 'index.html'
appjsp = assets / 'app.js'
bookp = assets / 'book.json'
bookdatap = assets / 'book-data.js'
cssp = assets / 'styles.css'
gradlep = project / 'app/build.gradle'
stringsp = project / 'app/src/main/res/values/strings.xml'
readmep = project / 'README.md'

# Each score tuple = Courage, Peur, Curiosité, Gentillesse.
chapters = [
    {
        'title':'La plume impossible','world':'MAISON','icon':'🪶','caption':'La maison et le jardin de Naïm','color':'#7457E8',
        'scenes':[
            {
                'title':'Une plume sur la fenêtre','icon':'🪶',
                'pages':[
                    'Au réveil, Naïm remarque quelque chose sur le rebord de sa fenêtre. Une grande plume brille doucement dans la lumière du matin.',
                    'Elle est bleue, puis violette, puis dorée. Naïm cligne des yeux. La plume change encore de couleur sans que personne ne la touche.',
                    'Quand Naïm approche sa main, la plume se redresse toute seule. Une petite étincelle court jusqu’à son doigt, comme si elle venait de dire bonjour.'
                ],
                'prompt':'Que fait Naïm avec la plume ?','choices':['La toucher une deuxième fois','L’observer de très près','Appeler quelqu’un avant de la prendre'],
                'results':['La plume devient verte puis se met à vibrer dans sa main.','Naïm découvre de minuscules dessins d’ailes sur sa tige.','Naïm garde ses distances, mais la plume saute toute seule dans sa main.'],
                'scores':[(2,0,2,0),(0,0,3,0),(0,2,1,0)]
            },
            {
                'title':'BOUM dans le jardin','icon':'🌳',
                'pages':[
                    'Un énorme BOUM fait trembler la vitre. Quelque chose vient de tomber dans le jardin, juste derrière les buissons.',
                    'Naïm court regarder. Des feuilles bougent dans tous les sens et une petite voix grogne : « Je contrôlais parfaitement mon atterrissage ! »',
                    'Au milieu des branches se débat un petit renard roux. Deux grandes ailes sombres, couvertes de motifs argentés, sont complètement emmêlées dans le buisson.'
                ],
                'prompt':'Comment Naïm réagit-il ?','choices':['Aider tout de suite le renard','Lui demander qui il est','Rester à distance et regarder ses ailes'],
                'results':['Naïm écarte doucement les branches et libère une aile.','Le renard répond : « Question raisonnable. Réponse compliquée. »','Les ailes ressemblent à celles d’un immense papillon de nuit.'],
                'scores':[(2,0,0,3),(1,0,2,1),(0,1,3,0)]
            },
            {
                'title':'Nox, le renard qui parle','icon':'🦊',
                'pages':[
                    'Le renard secoue ses ailes, remet une feuille derrière son oreille et annonce : « Nox. Messager officiel du Grand Bestiaire. Enfin… normalement. »',
                    'Naïm le regarde. Nox regarde Naïm. Puis Naïm demande calmement : « Les renards parlent souvent chez toi ? » Nox répond : « Seulement ceux qui ont quelque chose à dire. »',
                    'Nox explique qu’il vient chercher de l’aide. Dans son monde, les animaux fantastiques perdent leurs pouvoirs et certains disparaissent.'
                ],
                'prompt':'Quelle est la première réaction de Naïm ?','choices':['Dire qu’il veut aider','Demander ce qu’est le Grand Bestiaire','Demander si Nox est dangereux'],
                'results':['Nox sourit : « Excellent. J’espérais exactement cette réponse. »','Nox dessine dans la terre une vallée remplie de créatures étranges.','Nox réfléchit : « Seulement pour les biscuits laissés sans surveillance. »'],
                'scores':[(2,0,0,3),(0,0,3,0),(0,2,1,0)]
            },
            {
                'title':'La porte dans l’arbre','icon':'🚪',
                'pages':[
                    'Nox conduit Naïm jusqu’au vieil arbre au fond du jardin. Il n’y a pourtant jamais eu de porte sur son tronc.',
                    'La plume impossible s’échappe de la main de Naïm et touche l’écorce. Des lignes lumineuses dessinent lentement une poignée, puis une grande porte ronde.',
                    'Quand la porte s’entrouvre, Naïm aperçoit des montagnes violettes, des arbres immenses et quelque chose de gigantesque qui nage très haut dans le ciel.'
                ],
                'prompt':'Que fait Naïm devant le passage ?','choices':['Passer avec Nox','Regarder d’abord de l’autre côté','Demander à Nox de passer en premier'],
                'results':['Naïm franchit la porte avant d’avoir le temps de changer d’avis.','Naïm repère un chemin sûr et plusieurs créatures au loin.','Nox bombe le torse, passe… puis vérifie aussitôt que Naïm le suit.'],
                'scores':[(3,0,1,0),(1,0,3,0),(0,1,1,0)]
            },
            {
                'title':'Le Grand Bestiaire','icon':'🌈',
                'pages':[
                    'De l’autre côté, l’air sent les fleurs et la pluie. Des oiseaux à quatre ailes passent au-dessus de Naïm pendant qu’une tortue grande comme une voiture traverse tranquillement le chemin.',
                    'Plus loin, une baleine flotte entre les nuages. Un troupeau de petits cerfs lumineux boit près d’une rivière argentée. Naïm ne sait plus où regarder.',
                    'Pourtant, Nox ne sourit pas. Plusieurs animaux semblent fatigués. Une licorne essaie de faire briller sa corne, mais seule une toute petite étincelle apparaît.'
                ],
                'prompt':'Que veut faire Naïm en premier ?','choices':['Approcher les animaux fatigués','Questionner Nox sur les pouvoirs perdus','Observer les alentours pour chercher un indice'],
                'results':['Naïm s’approche lentement pour ne pas effrayer les créatures.','Nox confirme que les disparitions de magie deviennent plus nombreuses chaque jour.','Près du chemin, Naïm remarque une poussière transparente qui ne ressemble pas à du sable.'],
                'scores':[(1,0,1,3),(0,0,3,0),(0,0,3,0)]
            },
            {
                'title':'Zéphyr tombe du ciel','icon':'🦅',
                'pages':[
                    'Un jeune griffon bondit d’un rocher, ouvre fièrement ses ailes et crie : « Regardez bien ! » Il monte de trente centimètres… puis tombe dans un énorme tas de feuilles.',
                    'Il ressort la tête, couvert de brindilles. « C’était un test du sol », affirme-t-il. Nox soupire : « Naïm, voici Zéphyr. »',
                    'Les ailes de Zéphyr sont intactes, mais sa magie a disparu. Juste à côté, Naïm trouve un petit fragment de cristal parfaitement transparent et glacé.'
                ],
                'prompt':'Que fait Naïm ?','choices':['Aider Zéphyr à se relever','Examiner le cristal','Demander où Zéphyr était avant de perdre sa magie'],
                'results':['Zéphyr accepte l’aide tout en précisant qu’il allait « évidemment » se relever seul.','À l’intérieur du cristal, une minuscule lumière dorée tourne en rond.','Zéphyr se souvient d’un bruit étrange venant de la Forêt aux Mille Traces.'],
                'scores':[(1,0,0,3),(0,0,3,0),(0,0,3,1)]
            },
        ]
    },
    {
        'title':'La Forêt aux Mille Traces','world':'FORÊT','icon':'🌲','caption':'La forêt où les empreintes racontent des histoires','color':'#2F8F67',
        'scenes':[
            {
                'title':'Les empreintes qui arrivent avant','icon':'🐾',
                'pages':[
                    'Naïm, Nox et Zéphyr entrent dans une forêt où le sol est couvert d’empreintes. Certaines appartiennent à des pattes, d’autres à des sabots, et quelques-unes sont parfaitement rondes.',
                    'Soudain, trois nouvelles empreintes apparaissent devant eux. Une seconde plus tard, un petit lézard bleu passe exactement dessus.',
                    'Nox explique que cette forêt montre parfois les traces quelques instants avant le passage des animaux. Pour suivre le voleur de magie, il faudra choisir les bonnes.'
                ],
                'prompt':'Quelle piste Naïm suit-il ?','choices':['Les grandes traces profondes','Les petites traces brillantes','Attendre pour voir qui crée chaque trace'],
                'results':['Les grandes traces mènent à une branche cassée et à un morceau de tissu sombre.','Les traces brillantes conduisent vers une clairière silencieuse.','En patientant, Naïm élimine plusieurs fausses pistes sans se perdre.'],
                'scores':[(2,0,2,0),(1,0,3,0),(0,0,3,0)]
            },
            {
                'title':'Galet, la tortue de pierre','icon':'🐢',
                'pages':[
                    'Au milieu du chemin se trouve ce qui ressemble à un gros rocher. Puis le rocher ouvre un œil et dit très lentement : « Bon… jour. »',
                    'C’est Galet, une tortue dont la carapace est faite de pierre. Elle réfléchit si longtemps avant chaque phrase que Zéphyr commence deux fois une sieste.',
                    'Galet affirme avoir vu une grande silhouette en cape traverser la forêt avec une boîte de verre. Elle montre une direction avec sa tête… très, très lentement.'
                ],
                'prompt':'Comment Naïm parle-t-il avec Galet ?','choices':['Attendre patiemment toute son histoire','Lui poser des questions très courtes','L’aider à déplacer une branche avant de repartir'],
                'results':['Galet finit par révéler que la silhouette portait un masque blanc.','Avec des questions simples, Naïm apprend qu’elle allait vers la Clairière Dormante.','Galet remercie Naïm et lui donne un petit caillou marqué du symbole de la forêt.'],
                'scores':[(0,0,2,2),(0,0,3,1),(1,0,0,3)]
            },
            {
                'title':'La Clairière Dormante','icon':'🌙',
                'pages':[
                    'Dans une clairière, plusieurs animaux dorment profondément : un faon lumineux, deux écureuils à queues de plume et un énorme lapin couvert de mousse.',
                    'Ils respirent normalement, mais leurs couleurs sont ternes. Nox touche doucement le faon : sa lumière magique a presque disparu.',
                    'Autour d’eux, Naïm remarque de minuscules cristaux transparents. Ils forment une ligne qui s’enfonce entre les arbres.'
                ],
                'prompt':'Que fait Naïm avant de suivre la piste ?','choices':['Vérifier que les animaux vont bien','Ramasser un cristal avec précaution','Partir vite pour rattraper la silhouette'],
                'results':['Les animaux ne sont pas blessés. Ils semblent seulement vidés d’une partie de leur magie.','Le cristal pulse doucement lorsque Naïm approche la plume impossible.','Le groupe gagne du temps, mais Naïm regarde plusieurs fois derrière lui, inquiet pour les animaux.'],
                'scores':[(0,0,1,3),(1,0,3,0),(3,1,0,0)]
            },
            {
                'title':'Le ruisseau de verre','icon':'💎',
                'pages':[
                    'La piste mène à un petit ruisseau. Dans l’eau, des dizaines de fragments de cristal roulent entre les cailloux comme des glaçons qui ne fondent jamais.',
                    'Zéphyr veut traverser en sautant. Nox veut chercher un pont. Galet, qui les a finalement rejoints, entre directement dans l’eau : « Ça… ira. »',
                    'Au milieu du ruisseau, Naïm voit une lueur dorée emprisonnée dans un fragment plus gros. Cela ressemble exactement à la lumière trouvée près de Zéphyr.'
                ],
                'prompt':'Comment traverser ?','choices':['Suivre Galet dans l’eau','Chercher un passage plus sûr','Tester le gros cristal avec la plume'],
                'results':['Galet sert de guide solide et tout le monde traverse sans tomber.','Naïm trouve des pierres plates cachées sous les fougères.','Le cristal vibre, puis projette brièvement une flèche lumineuse vers le nord.'],
                'scores':[(2,0,0,1),(0,1,2,0),(1,0,3,0)]
            },
            {
                'title':'Le piège sans méchanceté','icon':'🕸️',
                'pages':[
                    'Une corde se tend brusquement et un grand filet tombe du ciel. Nox, Zéphyr et Naïm se retrouvent suspendus à un arbre, serrés les uns contre les autres.',
                    'Étrangement, le filet est doux. Aucun nœud ne fait mal et des coussins de feuilles amortissent les branches. « Quel voleur installe des pièges confortables ? » demande Naïm.',
                    'Zéphyr aperçoit un mécanisme. Sur le bois, quelqu’un a gravé un ancien symbole : un cercle entouré de quatre empreintes.'
                ],
                'prompt':'Comment sortir du filet ?','choices':['Grimper jusqu’au mécanisme','Demander à Zéphyr de couper une corde','Observer le symbole avant de bouger'],
                'results':['Naïm atteint le mécanisme et libère tout le monde.','Zéphyr coupe la bonne corde… après avoir demandé trois fois si son plan semble héroïque.','Le symbole correspond à quelque chose que Galet dit avoir déjà vu autrefois.'],
                'scores':[(3,0,1,0),(1,0,0,2),(0,0,3,0)]
            },
            {
                'title':'Le Collectionneur','icon':'🎭',
                'pages':[
                    'Au bout du sentier, une silhouette en longue cape sombre se tient devant un cerf ailé. Un masque blanc cache son visage.',
                    'La silhouette pointe un appareil de verre. Une lumière quitte doucement les bois du cerf et entre dans un cristal. Le cerf s’endort sans être blessé.',
                    'Naïm crie d’arrêter. La silhouette se retourne. Sa voix est calme : « Je ne leur fais aucun mal. Je les protège. » Puis un portail de verre s’ouvre derrière elle.'
                ],
                'prompt':'Que fait Naïm avant qu’elle parte ?','choices':['Courir vers le Collectionneur','Demander pourquoi il vole la magie','Regarder attentivement son appareil'],
                'results':['Naïm arrive presque à l’atteindre, mais le portail se referme juste devant lui.','Le Collectionneur répond seulement : « Parce que personne d’autre ne sait les garder en sécurité. »','Naïm voit que les cristaux sont rangés avec soin et portent chacun le dessin d’un animal.'],
                'scores':[(3,0,0,0),(1,0,2,1),(0,0,3,0)]
            },
        ]
    },
    {
        'title':'La Vallée des Dragons','world':'DRAGONS','icon':'🐉','caption':'La vallée chaude où le feu s’éteint','color':'#D95B43',
        'scenes':[
            {
                'title':'Une vallée qui refroidit','icon':'🌋',
                'pages':[
                    'La piste du Collectionneur conduit vers une vallée entourée de montagnes noires. D’habitude, l’air y est chaud. Aujourd’hui, Naïm voit même son souffle.',
                    'De grands dragons sont couchés près de rochers froids. Des cheminées naturelles qui crachaient autrefois des flammes ne produisent plus qu’un peu de fumée.',
                    'Un petit dragon essaie de souffler du feu. Il gonfle les joues, ferme les yeux… et produit une minuscule bulle transparente.'
                ],
                'prompt':'Que fait Naïm ?','choices':['Approcher le petit dragon','Chercher tout de suite des cristaux','Demander à Nox pourquoi le froid est dangereux'],
                'results':['Le petit dragon éclate de rire en voyant sa propre bulle.','Naïm trouve des traces de poussière de cristal près des cheminées.','Nox explique que les œufs de dragons ont besoin de chaleur magique pour éclore.'],
                'scores':[(1,0,1,2),(1,0,3,0),(0,0,3,0)]
            },
            {
                'title':'Flamme sans flamme','icon':'🔥',
                'pages':[
                    'Une jeune dragonne rouge atterrit devant le groupe avec beaucoup plus de bruit que nécessaire. « Je m’appelle Flamme. Et je n’ai absolument pas besoin d’aide. »',
                    'Pour le prouver, elle inspire profondément. Un petit nuage de fumée sort de son nez et lui noircit le bout du museau.',
                    'Flamme détourne la tête. Naïm comprend qu’elle est surtout inquiète : sans feu, elle ne peut plus réchauffer les plus jeunes dragons.'
                ],
                'prompt':'Comment Naïm réagit-il ?','choices':['Proposer son aide sans se moquer','Lui demander ce qu’elle a vu','Faire une blague sur la fumée pour la détendre'],
                'results':['Flamme hésite puis accepte : « Seulement parce que vous êtes déjà là. »','Elle se souvient d’un bourdonnement venant d’une grotte interdite.','Flamme essaie de rester sérieuse, puis finit par rire malgré elle.'],
                'scores':[(1,0,0,3),(0,0,3,1),(0,0,1,2)]
            },
            {
                'title':'Les œufs glacés','icon':'🥚',
                'pages':[
                    'Dans une grande caverne, des dizaines d’œufs reposent dans des nids de pierre. Leur coquille brille à peine.',
                    'Les adultes soufflent de la fumée autour d’eux, mais cela ne suffit plus. Flamme pose sa patte contre un œuf et baisse les oreilles.',
                    'Naïm remarque que les dernières sources chaudes de la caverne sont reliées à de fines conduites de verre qui disparaissent dans le mur.'
                ],
                'prompt':'Quelle priorité choisit Naïm ?','choices':['Aider à garder les œufs au chaud','Suivre immédiatement les conduites','Examiner comment les conduites aspirent la chaleur'],
                'results':['Tout le monde rassemble pierres chaudes et couvertures de mousse autour des nids.','Naïm trouve une fente cachée derrière une colonne rocheuse.','Il comprend que les conduites aspirent la magie, pas la chaleur normale.'],
                'scores':[(1,0,0,3),(2,0,2,0),(0,0,3,0)]
            },
            {
                'title':'La grotte qui bourdonne','icon':'🕳️',
                'pages':[
                    'Derrière la fente se cache un tunnel où résonne un bourdonnement régulier. Plus Naïm avance, plus les cristaux dans sa poche vibrent.',
                    'Le passage devient étroit. Nox replie ses ailes. Zéphyr fait semblant de ne pas être inquiet. Flamme avance devant, même si sa queue tremble un peu.',
                    'Au bout du tunnel, une lumière rouge pulse comme un cœur. Une énorme machine de verre remplit toute la grotte.'
                ],
                'prompt':'Comment approcher la machine ?','choices':['Avancer avec Flamme','Faire le tour pour chercher un interrupteur','Observer d’abord son fonctionnement'],
                'results':['Naïm et Flamme avancent ensemble malgré le bruit de plus en plus fort.','Nox découvre un panneau caché sous une plaque de métal.','Naïm voit des centaines de petits fils de lumière venir de toute la vallée.'],
                'scores':[(2,1,0,1),(1,0,3,0),(0,0,3,0)]
            },
            {
                'title':'La machine à voler le feu','icon':'⚙️',
                'pages':[
                    'La machine aspire la magie des dragons et la condense dans des cristaux rouges. Chaque pulsation fait faiblir les flammes de la vallée.',
                    'Zéphyr veut tout casser. Nox propose de couper les conduites. Flamme, elle, veut récupérer les cristaux avant qu’ils ne se brisent.',
                    'Naïm remarque un levier marqué du symbole des quatre empreintes. Le même symbole que sur le piège de la forêt.'
                ],
                'prompt':'Quel plan choisit Naïm ?','choices':['Couper l’arrivée de magie','Désactiver la machine avec le levier','Retirer les cristaux un par un'],
                'results':['Les conduites s’éteignent et le bourdonnement ralentit immédiatement.','Le levier arrête la machine sans casser un seul cristal.','Naïm récupère plusieurs fragments, mais la machine commence à trembler.'],
                'scores':[(2,0,2,1),(2,0,3,0),(2,1,2,0)]
            },
            {
                'title':'Le Grand Cristal du Feu','icon':'❤️‍🔥',
                'pages':[
                    'La machine s’arrête. Dans toute la vallée, les dragons recommencent à produire de petites flammes. Flamme en crache une si grande qu’elle sursaute elle-même.',
                    'Mais au centre de la machine se trouve un emplacement vide, beaucoup plus grand que les autres. Quelqu’un a retiré le cristal principal juste avant leur arrivée.',
                    'Sur le sol, Naïm découvre une marque de portail et une carte gravée dans le verre. Une ligne part de la vallée et rejoint un immense lac bleu.'
                ],
                'prompt':'Que décide Naïm ?','choices':['Suivre la piste vers le lac','Rester un peu pour aider les dragons','Demander à Flamme de venir avec eux'],
                'results':['Naïm promet de retrouver le Grand Cristal du Feu et reprend la route.','Le groupe aide à rallumer les nids avant de repartir.','Flamme accepte, mais seulement « pour surveiller Zéphyr », évidemment.'],
                'scores':[(2,0,2,0),(0,0,0,3),(1,0,0,2)]
            },
        ]
    },
    {
        'title':'Le Lac des Créatures Bleues','world':'LAC','icon':'🐋','caption':'Le lac où les chants disparaissent','color':'#3B82C4',
        'scenes':[
            {
                'title':'Le lac silencieux','icon':'🌊',
                'pages':[
                    'Le lac est si grand que Naïm ne voit presque pas l’autre rive. Pourtant, quelque chose semble étrange : aucun chant, aucun cri, aucun clapotis magique.',
                    'Des poissons-lanternes nagent près de la surface sans produire de lumière. Des hippocampes géants avancent lentement entre des roseaux bleus.',
                    'Même Nox parle moins fort. « Normalement, on entend ce lac à plusieurs kilomètres. »'
                ],
                'prompt':'Que fait Naïm en arrivant ?','choices':['Appeler les créatures du lac','Observer l’eau pour repérer un problème','Toucher l’eau avec un cristal'],
                'results':['Une petite tête bleue apparaît, puis disparaît aussitôt sous la surface.','Naïm remarque des cercles réguliers qui viennent du centre du lac.','Le cristal se met à vibrer et pointe vers les profondeurs.'],
                'scores':[(1,0,1,1),(0,0,3,0),(1,0,3,0)]
            },
            {
                'title':'Mélodie ne chante plus','icon':'🐋',
                'pages':[
                    'Une jeune baleine bleu clair sort lentement de l’eau. Elle est assez petite pour tenir dans une grande barque, mais ses nageoires ressemblent à des ailes.',
                    'Nox la présente : Mélodie. D’habitude, son chant fait flotter des bulles de lumière au-dessus du lac. Aujourd’hui, aucun son ne sort.',
                    'Mélodie essaie encore. Un tout petit « pouf » s’échappe de sa bouche. Elle baisse tristement la tête.'
                ],
                'prompt':'Comment Naïm aide-t-il Mélodie ?','choices':['La rassurer','Lui demander quand le silence a commencé','Essayer de comprendre son petit “pouf”'],
                'results':['Mélodie se rapproche et donne un petit coup de museau amical à Naïm.','Elle montre avec sa nageoire une ancienne tour au milieu du lac.','Le “pouf” fait apparaître une minuscule bulle qui part justement vers la tour.'],
                'scores':[(0,0,0,3),(0,0,3,1),(0,0,3,1)]
            },
            {
                'title':'La barque-coquillage','icon':'🐚',
                'pages':[
                    'Pour atteindre la tour, Mélodie pousse vers eux une énorme coquille vide qui flotte comme une barque.',
                    'Flamme trouve l’idée ridicule jusqu’au moment où elle essaie de monter et fait tourner la coquille trois fois sur elle-même. Zéphyr applaudit beaucoup trop fort.',
                    'Au centre du lac, des bulles sombres remontent des profondeurs. Elles éclatent sans bruit.'
                ],
                'prompt':'Qui dirige la barque ?','choices':['Naïm prend la rame','Laisser Nox guider grâce à ses ailes','Suivre Mélodie juste devant eux'],
                'results':['Naïm apprend vite à diriger la coquille entre les bulles.','Nox fait le fier jusqu’à ce qu’une rafale lui tourne les oreilles.','Mélodie connaît parfaitement le chemin et évite les zones dangereuses.'],
                'scores':[(2,0,1,0),(1,0,1,1),(0,0,1,2)]
            },
            {
                'title':'Sous la surface','icon':'🫧',
                'pages':[
                    'Près de la tour, Mélodie crée une grande bulle autour du groupe. La bulle plonge sous l’eau comme un ascenseur transparent.',
                    'Naïm découvre une ville aquatique : arches de corail, jardins de plantes lumineuses et tortues transparentes qui dorment sur des rochers.',
                    'Au fond, une conduite de verre traverse la ville. À l’intérieur, de petites notes lumineuses sont aspirées vers une énorme machine.'
                ],
                'prompt':'Que regarde Naïm en priorité ?','choices':['Les animaux affaiblis','La conduite de verre','Les symboles sur la machine'],
                'results':['Naïm vérifie que les créatures respirent normalement malgré leur fatigue.','La conduite transporte clairement les chants magiques du lac.','Les mêmes quatre empreintes sont gravées sur plusieurs pièces.'],
                'scores':[(0,0,1,3),(0,0,3,0),(0,0,3,0)]
            },
            {
                'title':'La machine des chants','icon':'🎵',
                'pages':[
                    'Cette machine ressemble à celle de la vallée, mais ses cristaux sont bleus et vibrent comme de petites cloches silencieuses.',
                    'Naïm découvre un cadran. Une flèche indique « TRANSFERT » et pointe vers une direction inconnue, très loin au-delà du lac.',
                    'Soudain, la machine démarre plus fort. Mélodie perd l’équilibre dans l’eau. Il faut l’arrêter rapidement.'
                ],
                'prompt':'Quel geste fait Naïm ?','choices':['Tirer le levier principal','Débrancher la conduite des chants','Faire signe à Flamme de chauffer un verrou'],
                'results':['Le levier descend difficilement, puis toute la machine s’éteint.','Les notes lumineuses repartent aussitôt vers le lac.','Flamme chauffe juste assez le verrou pour libérer le mécanisme sans abîmer les cristaux.'],
                'scores':[(3,0,1,0),(2,0,2,1),(1,0,2,2)]
            },
            {
                'title':'La route de lumière','icon':'✨',
                'pages':[
                    'Quand la machine s’éteint, Mélodie retrouve quelques notes de son chant. Des bulles lumineuses remontent jusqu’à la surface.',
                    'Naïm ouvre le panneau du transfert. Une ligne d’énergie traverse une carte entière du Grand Bestiaire et se dirige vers un endroit caché derrière des montagnes.',
                    'Pendant une seconde, la carte révèle une immense construction brillante : des tours, des dômes et des cages de verre. Puis l’image disparaît.'
                ],
                'prompt':'Que retient Naïm de cet indice ?','choices':['Mémoriser l’emplacement de la construction','Demander à Mélodie de venir avec eux','Garder un cristal bleu comme preuve'],
                'results':['Naïm trace rapidement le chemin sur un morceau d’écorce.','Mélodie accepte et nage dans l’air quelques secondes pour tester son pouvoir revenu.','Le cristal bleu continue de fredonner très doucement dans le sac de Naïm.'],
                'scores':[(0,0,3,0),(1,0,0,3),(0,0,2,0)]
            },
        ]
    },
    {
        'title':'Les Îles dans le Ciel','world':'CIEL','icon':'☁️','caption':'Les îles flottantes qui commencent à tomber','color':'#62AEE8',
        'scenes':[
            {
                'title':'L’escalier de nuages','icon':'☁️',
                'pages':[
                    'Pour atteindre les montagnes indiquées sur la carte, le groupe doit traverser les Îles du Ciel. Un escalier de nuages monte très haut au-dessus d’eux.',
                    'Chaque marche rebondit légèrement. Nox vole, Zéphyr bat des ailes avec prudence et Flamme grimpe en faisant semblant de ne jamais regarder en bas.',
                    'Au-dessus, des îles couvertes d’herbe flottent dans le ciel. Certaines sont beaucoup plus basses qu’elles ne devraient l’être.'
                ],
                'prompt':'Comment Naïm monte-t-il ?','choices':['Grimper sans s’arrêter','Tester chaque marche avant d’avancer','Demander à Mélodie de rester près de lui'],
                'results':['Naïm atteint rapidement la première île, essoufflé mais fier.','En avançant prudemment, Naïm repère deux marches qui se dissolvent trop vite.','Mélodie flotte à côté de lui et rend la montée beaucoup moins impressionnante.'],
                'scores':[(3,0,0,0),(1,1,2,0),(0,1,0,2)]
            },
            {
                'title':'Bouboule monte quand il a peur','icon':'🐻‍❄️',
                'pages':[
                    'Un petit ours blanc, aussi rond qu’un coussin, surgit derrière un rocher. Une aile de Zéphyr claque brusquement. L’ours pousse un cri… et monte de trois mètres dans les airs.',
                    '« Bouboule ! » crie Nox. Plus l’ours a peur, plus il flotte haut. Bouboule regarde le vide sous ses pattes et commence évidemment à avoir encore plus peur.',
                    'Il monte jusqu’à la branche d’un arbre flottant et s’y accroche comme une boule de coton.'
                ],
                'prompt':'Comment Naïm aide-t-il Bouboule ?','choices':['Lui parler doucement','Grimper pour le récupérer','Faire une blague pour qu’il pense à autre chose'],
                'results':['La voix calme de Naïm aide Bouboule à redescendre centimètre par centimètre.','Naïm grimpe jusqu’à lui et lui tend la main.','Bouboule rit tellement qu’il oublie sa peur et descend d’un coup sur les fesses.'],
                'scores':[(0,0,0,3),(2,1,0,2),(0,0,1,3)]
            },
            {
                'title':'L’île qui descend','icon':'🏝️',
                'pages':[
                    'Un grondement traverse le ciel. L’île sous leurs pieds commence lentement à descendre vers les nuages.',
                    'Des oiseaux à quatre ailes essaient de déplacer leurs nids. De petits moutons-nuages courent dans tous les sens en laissant derrière eux de minuscules averses.',
                    'Naïm aperçoit sous l’île de longues conduites de verre qui aspirent une lumière blanche. La magie qui la maintient en l’air est en train de disparaître.'
                ],
                'prompt':'Quelle urgence choisit Naïm ?','choices':['Aider les animaux à quitter l’île','Chercher l’endroit où passent les conduites','Essayer de bloquer une conduite visible'],
                'results':['Le groupe transporte plusieurs nids et guide les moutons-nuages vers une île voisine.','Naïm découvre que les conduites convergent sous un vieux moulin à vent.','Une pierre bien placée ralentit l’aspiration pendant quelques minutes.'],
                'scores':[(2,0,0,3),(1,0,3,0),(2,0,2,0)]
            },
            {
                'title':'Le nid au bord du vide','icon':'🪺',
                'pages':[
                    'Alors que tout le monde évacue, un petit cri vient du bord de l’île. Un nid est resté coincé sur une branche qui dépasse dans le vide.',
                    'Deux oisillons aux plumes arc-en-ciel sont à l’intérieur. Leur mère tourne autour sans pouvoir se poser à cause des rafales.',
                    'Zéphyr peut voler un peu, mais sa magie n’est pas complètement revenue. Bouboule peut flotter, mais uniquement lorsqu’il a peur, ce qui n’est pas un plan très précis.'
                ],
                'prompt':'Comment récupérer le nid ?','choices':['Naïm avance attaché à une corde','Zéphyr tente un petit vol contrôlé','Naïm rassure Bouboule puis utilise sa flottabilité'],
                'results':['Naïm atteint la branche pendant que Flamme et Nox tiennent solidement la corde.','Zéphyr vole juste assez longtemps pour pousser le nid vers la sécurité.','Bouboule monte doucement avec Naïm accroché à une longue liane et redescend sans paniquer.'],
                'scores':[(3,1,0,2),(2,0,0,2),(1,1,1,3)]
            },
            {
                'title':'Le moulin cassé','icon':'🌬️',
                'pages':[
                    'Sous le vieux moulin, le groupe trouve une troisième machine. Celle-ci aspire le vent magique des îles et l’envoie dans des cristaux blancs.',
                    'Une partie de la machine est déjà cassée, comme si quelqu’un était parti très vite. Des morceaux de métal portent le symbole des quatre empreintes.',
                    'Naïm découvre aussi un petit médaillon ancien, coincé sous un engrenage. Le même symbole est gravé dessus, mais entouré de mots : « Gardiens du Grand Bestiaire ». '
                ],
                'prompt':'Que fait Naïm avec le médaillon ?','choices':['Le montrer immédiatement à Nox','L’examiner avec Zéphyr','Le garder pour le montrer à Maître Hibou'],
                'results':['Nox devient très sérieux : il connaît ce symbole depuis toujours.','Zéphyr remarque que le métal est ancien, bien plus ancien que les machines.','Naïm range le médaillon. Il veut une explication complète, pas une réponse à moitié.'],
                'scores':[(0,0,2,1),(0,0,3,0),(1,0,2,0)]
            },
            {
                'title':'Le symbole des Gardiens','icon':'🦉',
                'pages':[
                    'Maître Hibou les rejoint grâce à un portail de feuilles. C’est un immense hibou gris portant une petite sacoche pleine de cartes.',
                    'Quand Naïm lui montre le médaillon, ses plumes se hérissent. « Ce symbole appartenait aux anciens Gardiens. Nous protégions les animaux et les passages. »',
                    'Il regarde la direction de la construction de verre. « Si le Collectionneur porte encore ce signe, alors je crains de savoir qui il est. Mais j’ai besoin d’en être certain. »'
                ],
                'prompt':'Que demande Naïm à Maître Hibou ?','choices':['Qui pourrait être le Collectionneur ?','Pourquoi les Gardiens ont disparu ?','Comment atteindre la construction de verre ?'],
                'results':['Maître Hibou répond : « Un ancien Gardien nommé Orphéo. Mais je veux voir son visage avant de l’accuser. »','Il explique que les Gardiens se sont séparés après une catastrophe ancienne.','Il indique un raccourci par le Désert des Mirages.'],
                'scores':[(0,0,3,0),(0,0,3,1),(1,0,3,0)]
            },
        ]
    },
    {
        'title':'Le Désert des Mirages','world':'DÉSERT','icon':'🏜️','caption':'Le désert où les idées deviennent parfois réelles','color':'#D69B45',
        'scenes':[
            {
                'title':'Le sable qui invente','icon':'🏜️',
                'pages':[
                    'Le Désert des Mirages brille sous un soleil blanc. Ici, les mirages ne se contentent pas de tromper les yeux : parfois, ils deviennent réels pendant quelques minutes.',
                    'Naïm pense à un verre d’eau. Aussitôt, trois verres apparaissent sur un rocher. Nox crie : « Ne pense surtout pas à un gâteau géant ! »',
                    'Une seconde plus tard, un gâteau énorme tombe dans le sable. Tout le monde regarde Nox. « J’ai peut-être pensé un peu trop fort », avoue-t-il.'
                ],
                'prompt':'Comment Naïm traverse-t-il le désert ?','choices':['Se concentrer sur le chemin','Tester volontairement un petit mirage','Demander au groupe de penser à des choses calmes'],
                'results':['Naïm garde les yeux sur les montagnes et évite plusieurs distractions.','Une petite gourde imaginaire devient réelle juste assez longtemps pour remplir un bol.','Pendant quelques minutes, le désert se remplit surtout de coussins, de fleurs et d’un sandwich très poli.'],
                'scores':[(2,0,2,0),(1,0,3,0),(0,0,1,2)]
            },
            {
                'title':'Trois Nox de trop','icon':'🦊',
                'pages':[
                    'Une dune se met à trembler. Trois copies de Nox apparaissent devant le vrai Nox. Elles ont les mêmes ailes, la même voix et exactement le même air vexé.',
                    '« Facile », dit Zéphyr. « Le vrai Nox doit savoir quelque chose que les autres ignorent. » Les quatre Nox répondent ensemble : « Excellente idée. »',
                    'Naïm remarque pourtant que les copies viennent du désert. Elles devraient disparaître si personne ne nourrit le mirage.'
                ],
                'prompt':'Comment trouver le vrai Nox ?','choices':['Poser une question personnelle','Observer les détails de leurs ailes','Ignorer les quatre jusqu’à ce que les copies disparaissent'],
                'results':['Le vrai Nox est le seul à connaître le nom que sa grand-mère lui donne quand elle est fâchée. Il refuse de le répéter.','Naïm repère une petite plume tordue sur l’aile gauche du vrai Nox.','Les copies commencent à bailler puis fondent dans le sable. Le vrai Nox trouve la méthode vexante mais efficace.'],
                'scores':[(0,0,3,1),(0,0,3,0),(0,0,2,0)]
            },
            {
                'title':'Le Zéphyr parfait','icon':'🦅',
                'pages':[
                    'Un griffon magnifique descend du ciel. Ses plumes brillent, ses ailes sont immenses et son atterrissage est parfait. Il annonce : « Je suis Zéphyr, héros légendaire. »',
                    'Le vrai Zéphyr reste bouche ouverte. Le mirage réalise toutes les figures qu’il n’arrive plus à faire depuis qu’il a perdu sa magie.',
                    'Zéphyr baisse la tête. « Peut-être que lui devrait continuer l’aventure à ma place. » Naïm comprend que cette fois le mirage touche quelque chose de plus profond.'
                ],
                'prompt':'Que dit Naïm à Zéphyr ?','choices':['Lui rappeler tout ce qu’il a déjà réussi','Lui proposer de traverser ensemble','Lui demander ce que le vrai Zéphyr ferait maintenant'],
                'results':['Zéphyr redresse les épaules. Sauver un nid sans toute sa magie était déjà héroïque.','Naïm avance à côté de lui jusqu’à ce que le mirage disparaisse.','Zéphyr réfléchit puis répond : « Il continuerait. Même avec des ailes imparfaites. »'],
                'scores':[(0,0,0,3),(1,0,0,3),(1,0,2,2)]
            },
            {
                'title':'La tempête de verre','icon':'🌪️',
                'pages':[
                    'Le vent se lève brusquement. Des grains de sable se transforment en minuscules éclats transparents qui tournent autour du groupe sans les couper.',
                    'Maître Hibou reconnaît une tempête de verre. Elle apparaît lorsque trop de magie étrangère traverse le désert.',
                    'Au loin, une énorme lueur pulse derrière les dunes. C’est forcément la direction des machines du Collectionneur.'
                ],
                'prompt':'Comment traverser la tempête ?','choices':['Avancer malgré le vent','Se protéger derrière Galet','Suivre les éclats qui vont tous dans la même direction'],
                'results':['Naïm avance courbé contre le vent, guidé par la plume impossible.','Galet devient un abri parfait. Il semble même content d’être enfin utile sans devoir se dépêcher.','Les éclats forment un courant qui conduit directement vers une falaise invisible.'],
                'scores':[(3,1,0,0),(0,1,0,2),(1,0,3,0)]
            },
            {
                'title':'La Ménagerie de Verre','icon':'🏛️',
                'pages':[
                    'Derrière le dernier mirage apparaît une construction immense. Des dômes transparents, des ponts et des tours de verre s’étendent jusqu’à l’horizon.',
                    'À l’intérieur, Naïm aperçoit des forêts, des bassins, des rochers et des nuages artificiels. Des dizaines d’animaux fantastiques vivent dans ces habitats.',
                    'Ils ont de la nourriture, de l’eau et des abris parfaits. Mais chaque habitat est fermé. Aucune créature ne peut partir.'
                ],
                'prompt':'Quelle est la première pensée de Naïm ?','choices':['Chercher comment entrer','Observer si les animaux sont blessés','Demander pourquoi quelqu’un construirait un endroit aussi beau pour enfermer des animaux'],
                'results':['Naïm repère une porte de service cachée sous un pont de verre.','Les animaux semblent en bonne santé, mais plusieurs regardent constamment vers l’extérieur.','Maître Hibou murmure : « Parce qu’il pense vraiment les protéger. »'],
                'scores':[(2,0,2,0),(0,0,2,2),(0,0,3,1)]
            },
            {
                'title':'Protégés ou prisonniers ?','icon':'🔒',
                'pages':[
                    'Depuis une dune, le groupe observe la Ménagerie. Un dragon reçoit de la nourriture. Une licorne dort sous un arbre. Rien ne semble cruel.',
                    'Puis un petit cerf ailé s’approche de la paroi et regarde longtemps le ciel libre. Ses ailes ne brillent presque plus.',
                    'Naïm comprend enfin le plan : retirer les pouvoirs empêche les animaux de s’échapper. Le Collectionneur veut les garder en sécurité pour toujours.'
                ],
                'prompt':'Que décide Naïm ?','choices':['Libérer les animaux dès que possible','Comprendre d’abord pourquoi le Collectionneur agit ainsi','Chercher une entrée discrète et une clé'],
                'results':['Naïm serre la plume dans sa main. Personne ne devrait être obligé de rester ici.','Maître Hibou approuve : comprendre Orphéo pourrait éviter une bataille inutile.','Nox connaît une ancienne histoire parlant d’une clé des Gardiens cachée dans la Jungle des Métamorphoses.'],
                'scores':[(2,0,0,3),(0,0,3,2),(1,0,3,0)]
            },
        ]
    },
    {
        'title':'La Jungle des Métamorphoses','world':'JUNGLE','icon':'🦎','caption':'La jungle où rien ne garde longtemps la même forme','color':'#3F9D58',
        'scenes':[
            {
                'title':'La jungle qui change','icon':'🌿',
                'pages':[
                    'La Jungle des Métamorphoses commence derrière une cascade verte. Ici, les feuilles changent de forme, les fleurs déplacent leurs pétales et même certaines pierres deviennent parfois molles.',
                    'Nox avertit Naïm : plusieurs animaux de cette région peuvent copier les objets qu’ils voient. Il ne faut donc pas ramasser n’importe quoi.',
                    'À peine a-t-il terminé qu’un deuxième sac apparaît à côté de celui de Naïm. Le faux sac remue discrètement.'
                ],
                'prompt':'Que fait Naïm avec le faux sac ?','choices':['Lui parler','Le toucher doucement avec une branche','Attendre qu’il reprenne sa vraie forme'],
                'results':['Le sac éternue et redevient un petit caméléon violet, très embarrassé.','Le faux sac se met à rire et abandonne immédiatement son déguisement.','Après quelques secondes, deux yeux apparaissent sur la fermeture éclair.'],
                'scores':[(0,0,2,2),(1,0,2,0),(0,0,3,0)]
            },
            {
                'title':'La chaussure vivante','icon':'👟',
                'pages':[
                    'Une chaussure jaune est posée au milieu du sentier. Naïm passe devant. La chaussure les suit de vingt centimètres.',
                    'Il se retourne. Elle s’immobilise. Il repart. Elle les suit encore. Zéphyr chuchote : « Nous sommes poursuivis par une chaussure. C’est nouveau. »',
                    'La chaussure finit par avouer en redevenant un caméléon : il voulait copier Naïm, mais n’a regardé que ses pieds.'
                ],
                'prompt':'Comment Naïm réagit-il ?','choices':['Rire avec le caméléon','Lui demander s’il connaît la clé des Gardiens','L’aider à réussir une autre transformation'],
                'results':['Le caméléon rit si fort qu’il devient successivement chaussure, banane puis petit tabouret.','Il indique un ancien temple au centre de la jungle.','Naïm lui montre un caillou simple. Cette fois la copie est presque parfaite.'],
                'scores':[(0,0,1,2),(0,0,3,1),(0,0,2,3)]
            },
            {
                'title':'Le labyrinthe des copies','icon':'🪞',
                'pages':[
                    'Le chemin vers le temple traverse un labyrinthe de plantes capables de copier les voyageurs. Bientôt, trois faux Zéphyr, deux faux Nox et une fausse Flamme bloquent le passage.',
                    'Les copies répètent leurs gestes avec une seconde de retard. Même leur voix semble presque exacte.',
                    'Naïm remarque que les vraies créatures possèdent toutes de petits défauts : une plume tordue, une tache de fumée, une aile froissée. Les copies, elles, sont trop parfaites.'
                ],
                'prompt':'Comment Naïm trouve-t-il les vrais amis ?','choices':['Chercher leurs petits défauts familiers','Leur poser des questions personnelles','Faire un geste imprévisible et regarder qui réagit naturellement'],
                'results':['Naïm retrouve chaque ami grâce aux détails qu’il connaît bien maintenant.','Les copies inventent des réponses absurdes et se trahissent très vite.','Le vrai Nox éclate de rire avant même d’essayer de copier le geste.'],
                'scores':[(0,0,3,2),(0,0,3,2),(1,0,3,1)]
            },
            {
                'title':'Le temple des quatre empreintes','icon':'🗿',
                'pages':[
                    'Au centre de la jungle, des racines entourent un petit temple de pierre. Sur sa porte figure exactement le symbole des anciens Gardiens.',
                    'Quatre empreintes sont creusées dans la pierre : patte, aile, sabot et main humaine. Maître Hibou semble surpris par la dernière.',
                    '« Les premiers Gardiens pensaient que les humains et les animaux pouvaient travailler ensemble », explique-t-il. « Puis nous avons cessé d’y croire. »'
                ],
                'prompt':'Comment Naïm ouvre-t-il le temple ?','choices':['Poser sa main sur l’empreinte humaine','Demander à chaque ami de toucher une empreinte','Observer les inscriptions avant d’essayer'],
                'results':['L’empreinte s’illumine sous la main de Naïm et la porte bouge légèrement.','Naïm, Nox, Zéphyr et Galet activent ensemble les quatre marques.','Les inscriptions disent : « Une clé ne sert pas à posséder. Elle sert à ouvrir. »'],
                'scores':[(2,0,2,0),(1,0,1,3),(0,0,3,0)]
            },
            {
                'title':'La clé des Gardiens','icon':'🗝️',
                'pages':[
                    'Dans le temple repose une grande clé argentée, légère comme une plume. Elle change légèrement de forme selon la serrure qu’on imagine.',
                    'Naïm la prend. Aussitôt, un bruit de verre résonne derrière eux. Un portail transparent vient de s’ouvrir entre les arbres.',
                    'Le Collectionneur en sort. « Cette clé ne vous appartient pas », dit-il. Sa voix n’est pas menaçante. Elle semble surtout fatiguée.'
                ],
                'prompt':'Que répond Naïm ?','choices':['“Les animaux ne t’appartiennent pas non plus.”','“Pourquoi veux-tu tellement les enfermer ?”','“Aide-nous à les libérer et explique-nous.”'],
                'results':['Le Collectionneur reste silencieux. La phrase l’a clairement touché.','Ses épaules se raidissent : « Parce que j’ai déjà perdu quelqu’un. »','Pendant un instant, sa main quitte l’appareil de verre.'],
                'scores':[(2,0,0,2),(0,0,3,1),(1,0,1,3)]
            },
            {
                'title':'Le masque tombe','icon':'🎭',
                'pages':[
                    'Zéphyr recule, accroche une liane et déclenche une pluie de feuilles. Le Collectionneur lève le bras pour se protéger. Son masque glisse et tombe au sol.',
                    'Maître Hibou devient immobile. Devant eux se tient un homme aux cheveux gris, avec un ancien insigne de Gardien sur sa veste.',
                    '« Orphéo », souffle Maître Hibou. Le Collectionneur ferme les yeux. « Cela faisait longtemps que personne ne m’avait appelé ainsi. »'
                ],
                'prompt':'Que fait Naïm après cette révélation ?','choices':['Demander à Maître Hibou toute la vérité','Demander directement à Orphéo de raconter son histoire','Protéger la clé et quitter la jungle'],
                'results':['Maître Hibou accepte enfin de conduire le groupe aux archives des Gardiens.','Orphéo répond : « Vous n’écouteriez pas. Pas encore. » Puis il disparaît dans son portail.','Naïm garde la clé, mais il sait qu’il lui manque encore une partie essentielle de l’histoire.'],
                'scores':[(0,0,3,1),(1,0,3,1),(2,1,0,0)]
            },
        ]
    },
    {
        'title':'La Cité des Gardiens','world':'CITÉ','icon':'🦉','caption':'Les archives oubliées des anciens protecteurs','color':'#6767A8',
        'scenes':[
            {
                'title':'La cité abandonnée','icon':'🏛️',
                'pages':[
                    'Maître Hibou conduit le groupe dans une vallée cachée. Des tours rondes et des ponts couverts de mousse entourent une grande place silencieuse.',
                    'Autrefois, des Gardiens vivaient ici avec les animaux fantastiques. Aujourd’hui, seules quelques lanternes magiques fonctionnent encore.',
                    'Au centre de la place se dresse une statue représentant plusieurs animaux autour d’une main humaine. Naïm reconnaît le symbole du temple.'
                ],
                'prompt':'Où Naïm veut-il aller d’abord ?','choices':['Aux archives','Dans l’ancienne salle des Gardiens','Examiner la statue centrale'],
                'results':['Maître Hibou ouvre une porte couverte de poussière et de plumes.','La salle contient encore des cartes, des uniformes et des portraits.','Sous la statue, Naïm trouve une inscription : « Protéger sans posséder. »'],
                'scores':[(0,0,3,0),(0,0,3,0),(0,0,3,1)]
            },
            {
                'title':'Le portrait d’Orphéo','icon':'🖼️',
                'pages':[
                    'Dans un vieux couloir, Naïm découvre un portrait d’Orphéo plus jeune. Il sourit, entouré de dizaines de petites créatures.',
                    'Sur son épaule se trouve un minuscule animal blanc avec de longues oreilles, une queue en plume et deux petites cornes.',
                    'Maître Hibou murmure son nom : « Pim. Orphéo l’avait recueilli quand il était encore bébé. Ils ne se quittaient jamais. »'
                ],
                'prompt':'Que demande Naïm ?','choices':['Ce qui est arrivé à Pim','Pourquoi Orphéo aimait autant les animaux','Pourquoi personne n’a aidé Orphéo après la disparition'],
                'results':['Maître Hibou baisse les yeux : « Pim a disparu pendant une tempête magique. »','Orphéo avait toujours été celui qui recueillait les créatures perdues ou blessées.','Maître Hibou reste silencieux plus longtemps. « Nous avons mal compris sa peur. »'],
                'scores':[(0,0,3,1),(0,0,2,1),(0,0,3,2)]
            },
            {
                'title':'La nuit où Pim a disparu','icon':'⛈️',
                'pages':[
                    'Les archives contiennent le journal d’Orphéo. Naïm lit l’histoire d’une terrible tempête qui avait ouvert des dizaines de portails sauvages.',
                    'Orphéo avait essayé de protéger Pim. Un éclair de magie avait pourtant ouvert un passage sous leurs pieds. Pim était tombé à travers avant que le portail se referme.',
                    'Pendant des mois, Orphéo avait cherché partout. Il n’avait jamais retrouvé Pim. Après cela, il avait commencé à écrire la même phrase : « Plus jamais. »'
                ],
                'prompt':'Comment Naïm comprend-il Orphéo ?','choices':['Il comprend sa peur, mais pas ses cages','Il pense qu’Orphéo a besoin d’aide autant que les animaux','Il veut chercher si Pim pourrait encore être vivant'],
                'results':['Naïm comprend enfin que le Collectionneur agit par peur de perdre, pas par cruauté.','Maître Hibou acquiesce : « J’aurais dû le comprendre beaucoup plus tôt. »','Les archives indiquent que le portail de Pim n’a jamais été identifié. Cela reste un mystère.'],
                'scores':[(0,0,2,2),(0,0,1,3),(0,0,3,2)]
            },
            {
                'title':'La faute de Maître Hibou','icon':'🦉',
                'pages':[
                    'Maître Hibou ferme le journal. « Quand Orphéo a commencé à construire ses premiers refuges fermés, nous nous sommes disputés. Je lui ai demandé de partir. »',
                    'Il pensait protéger le Grand Bestiaire en éloignant Orphéo. Orphéo, lui, a compris qu’il devait agir seul.',
                    '« J’avais raison sur les cages », dit Maître Hibou. « Mais j’ai eu tort de croire qu’avoir raison suffisait. »'
                ],
                'prompt':'Que répond Naïm à Maître Hibou ?','choices':['Lui dire qu’il peut encore réparer une partie de son erreur','Lui demander de parler lui-même à Orphéo','Lui rappeler que les animaux ont besoin d’eux maintenant'],
                'results':['Maître Hibou redresse la tête : « Alors faisons-le. »','Il promet de parler à Orphéo sans colère s’ils le retrouvent.','Le groupe range le journal et se prépare à agir.'],
                'scores':[(0,0,0,3),(0,0,1,3),(1,0,0,2)]
            },
            {
                'title':'Le plan de la Ménagerie','icon':'🗺️',
                'pages':[
                    'Dans une armoire secrète, Naïm trouve d’anciens plans. La Ménagerie de Verre a été construite sur les fondations d’un refuge des Gardiens.',
                    'La clé argentée peut ouvrir les portes principales, mais toutes les magies volées sont stockées dans une salle centrale appelée le Cœur de Verre.',
                    'Si les cristaux sont libérés n’importe comment, leurs pouvoirs pourraient se mélanger. Il faudra donc avancer avec précaution.'
                ],
                'prompt':'Quel plan choisit Naïm ?','choices':['Libérer d’abord les animaux puis les cristaux','Entrer directement dans le Cœur de Verre','Trouver Orphéo et essayer de le convaincre avant d’ouvrir quoi que ce soit'],
                'results':['Le groupe décide de créer des chemins de sortie avant de toucher aux pouvoirs.','Naïm mémorise le chemin le plus court vers la salle centrale.','Maître Hibou approuve, mais personne ne sait si Orphéo acceptera de les écouter.'],
                'scores':[(1,0,2,3),(2,0,3,0),(1,0,2,3)]
            },
            {
                'title':'Retour vers les cages','icon':'🗝️',
                'pages':[
                    'Nox attache la clé des Gardiens au sac de Naïm. Zéphyr vérifie ses ailes. Flamme produit une flamme correcte. Mélodie fredonne trois notes claires.',
                    'Bouboule inspire profondément pour essayer de rester au sol. Galet arrive enfin au bout de la place et annonce : « Je… suis… prêt. »',
                    'Le groupe prend la direction de la Ménagerie. Cette fois, ils savent qui est Orphéo, ce qu’il a perdu et ce qu’ils doivent empêcher.'
                ],
                'prompt':'Quel message Naïm donne-t-il au groupe ?','choices':['“On libère tout le monde, mais sans blesser personne.”','“On écoute Orphéo s’il accepte de parler.”','“On reste ensemble quoi qu’il arrive.”'],
                'results':['Flamme approuve immédiatement. Même Zéphyr promet de ne pas foncer seul.','Maître Hibou remercie Naïm d’avoir laissé une porte ouverte au dialogue.','Bouboule se rapproche de Naïm. Cette règle lui plaît beaucoup.'],
                'scores':[(2,0,0,3),(0,0,1,3),(1,0,0,3)]
            },
        ]
    },
    {
        'title':'La Ménagerie de Verre','world':'MÉNAGERIE','icon':'🔮','caption':'Les magnifiques refuges dont personne ne peut sortir','color':'#78A9B8',
        'scenes':[
            {
                'title':'La porte de service','icon':'🚪',
                'pages':[
                    'La clé argentée change de forme dès que Naïm l’approche de la petite porte repérée dans le désert. Elle devient fine, tourne toute seule et déverrouille la serrure.',
                    'À l’intérieur, les couloirs sont propres et silencieux. Des chariots transportent automatiquement de la nourriture vers les différents habitats.',
                    'Naïm entend des bruits d’animaux derrière les parois. Aucun cri de douleur. Seulement des appels, comme s’ils demandaient où se trouve la sortie.'
                ],
                'prompt':'Comment le groupe avance-t-il ?','choices':['Très discrètement','En laissant des signes pour retrouver la sortie','En cherchant immédiatement les commandes des cages'],
                'results':['Nox vole près du plafond et prévient le groupe avant chaque intersection.','Naïm dessine de petites flèches à la craie sur le sol.','Zéphyr repère un panneau indiquant « Habitats principaux ».'],
                'scores':[(1,1,2,0),(0,0,2,1),(2,0,3,0)]
            },
            {
                'title':'Des paradis fermés','icon':'🌿',
                'pages':[
                    'Le premier habitat contient une petite forêt parfaite. Température idéale, fruits frais, rivière claire. Pourtant, les cerfs ailés se pressent contre la porte quand ils voient Naïm.',
                    'Le second ressemble à une montagne pour dragons. Le troisième contient un lac miniature. Orphéo a réellement essayé de reproduire chaque maison.',
                    '« Il a tout prévu », murmure Nox. Naïm secoue la tête. « Sauf le fait qu’ils puissent vouloir partir. »'
                ],
                'prompt':'Que fait Naïm ?','choices':['Ouvrir le premier habitat','Parler aux animaux avant d’ouvrir','Chercher si chaque animal veut vraiment partir'],
                'results':['La porte s’ouvre et les cerfs sortent lentement, presque sans croire que c’est possible.','Les animaux se rapprochent. Plusieurs indiquent clairement la sortie avec leurs ailes ou leurs pattes.','Naïm comprend que quelques créatures très jeunes préfèrent attendre leurs familles avant de bouger.'],
                'scores':[(2,0,0,3),(0,0,1,3),(0,0,2,3)]
            },
            {
                'title':'Orphéo revient','icon':'🧑‍🦳',
                'pages':[
                    'Une alarme douce retentit. Orphéo apparaît au bout du couloir. Il ne porte plus son masque.',
                    'Il voit les portes ouvertes et serre les poings. « Vous ne comprenez pas. Dehors, ils peuvent se perdre, être blessés, disparaître. Ici, rien ne peut leur arriver. »',
                    'Maître Hibou avance. « Orphéo, je suis désolé de t’avoir abandonné avec cette peur. Mais ceci n’est pas une protection. »'
                ],
                'prompt':'Que dit Naïm à Orphéo ?','choices':['“Être en sécurité ne suffit pas si on n’est jamais libre.”','“Viens voir ce que les animaux choisissent eux-mêmes.”','“Pim n’aurait peut-être pas voulu vivre dans une cage.”'],
                'results':['Orphéo regarde les animaux qui hésitent devant les portes ouvertes.','Naïm l’invite à marcher avec eux sans toucher à son appareil.','Orphéo pâlit. La phrase est difficile à entendre, mais il ne répond pas avec colère.'],
                'scores':[(1,0,1,3),(0,0,1,3),(1,1,1,2)]
            },
            {
                'title':'Le Cœur de Verre','icon':'💎',
                'pages':[
                    'Au centre de la Ménagerie se trouve une salle immense. Des centaines de cristaux flottent dans l’air, chacun rempli d’une couleur, d’un son ou d’un mouvement.',
                    'Rouge pour le feu des dragons. Bleu pour les chants du lac. Blanc pour le vent des îles. Et beaucoup d’autres pouvoirs inconnus.',
                    'Orphéo explique qu’il comptait rendre les pouvoirs une fois chaque animal installé. Mais il avait toujours trouvé une nouvelle raison d’attendre.'
                ],
                'prompt':'Comment Naïm veut-il rendre les pouvoirs ?','choices':['Un animal à la fois','En suivant les étiquettes d’Orphéo','En demandant aux animaux de reconnaître leur propre magie'],
                'results':['Le groupe prépare une longue file pour éviter toute confusion.','Les étiquettes sont précises, mais certaines se sont décollées pendant les transferts.','Plusieurs animaux réagissent immédiatement lorsque leur cristal approche.'],
                'scores':[(0,0,2,3),(0,0,3,1),(0,0,2,3)]
            },
            {
                'title':'La libération commence','icon':'🔓',
                'pages':[
                    'Les premiers cristaux s’ouvrent correctement. Un cerf retrouve sa lumière. Une tortue redevient légère dans l’eau. Mélodie récupère une nouvelle note de son chant.',
                    'Flamme touche le Grand Cristal du Feu. Une vague rouge traverse la salle et repart vers tous les dragons du Bestiaire.',
                    'Puis une alarme beaucoup plus forte retentit. Plusieurs cristaux sans étiquette commencent à vibrer ensemble au-dessus du Cœur de Verre.'
                ],
                'prompt':'Que fait Naïm ?','choices':['Éloigner les animaux de la salle','Essayer de séparer les cristaux qui vibrent','Demander à Orphéo de couper le système central'],
                'results':['Naïm guide les plus jeunes vers les couloirs pendant que les autres restent à distance.','Il en sépare deux, mais une dizaine d’autres se rapprochent encore.','Orphéo court vers la console et coupe l’alimentation, trop tard pour arrêter la fusion.'],
                'scores':[(2,0,0,3),(2,1,2,0),(1,0,1,2)]
            },
            {
                'title':'Méli-Mélo','icon':'🦄',
                'pages':[
                    'Les cristaux se rejoignent dans un grand éclair multicolore. Quand la lumière disparaît, une créature immense est assise au milieu de la salle.',
                    'Elle possède des ailes de griffon, une queue de dragon, des oreilles de lapin, des nageoires, des pattes différentes et beaucoup trop de magie pour savoir quoi en faire.',
                    'La créature regarde tout le monde, pousse un petit couinement terrifié… puis éternue une boule de feu qui se transforme en pluie de plumes. Orphéo murmure : « Qu’est-ce que j’ai fait ? »'
                ],
                'prompt':'Comment Naïm réagit-il à Méli-Mélo ?','choices':['Lui parler doucement','Éloigner tout le monde sans l’attaquer','Observer quels pouvoirs semblent lui faire peur'],
                'results':['Méli-Mélo arrête de reculer pendant une seconde et écoute la voix de Naïm.','Le groupe ouvre un passage pour que la créature ne se sente pas encerclée.','Naïm comprend que chaque pouvoir se déclenche surtout lorsque Méli-Mélo panique.'],
                'scores':[(1,1,0,3),(1,1,0,3),(0,0,3,2)]
            },
        ]
    },
    {
        'title':'Le Cœur du Grand Bestiaire','world':'FINAL','icon':'🌟','caption':'Tous les animaux unissent leurs forces','color':'#C655A2',
        'scenes':[
            {
                'title':'Méli-Mélo s’enfuit','icon':'💨',
                'pages':[
                    'Un autre cristal éclate derrière Méli-Mélo. La créature prend peur, déploie ses ailes et traverse le plafond dans un tourbillon de lumière.',
                    'Elle s’envole vers le Grand Bestiaire en laissant derrière elle des nuages roses, des gouttes qui remontent vers le ciel et quelques poissons transparents qui flottent dans l’air.',
                    'Orphéo saisit son appareil. « Je dois la capturer avant qu’elle détruise tout ! » Naïm l’arrête. Méli-Mélo n’a attaqué personne volontairement.'
                ],
                'prompt':'Quel plan propose Naïm ?','choices':['Suivre Méli-Mélo et la calmer','Rassembler les animaux dont elle porte les pouvoirs','Demander à Orphéo de venir sans appareil de capture'],
                'results':['Nox repère la trace multicolore et le groupe part immédiatement.','Maître Hibou ouvre des portails vers les régions déjà visitées.','Orphéo hésite puis pose son appareil sur le sol avant de suivre Naïm.'],
                'scores':[(2,0,1,2),(1,0,2,3),(1,0,0,3)]
            },
            {
                'title':'Les pouvoirs deviennent fous','icon':'🌪️',
                'pages':[
                    'Méli-Mélo traverse la forêt. Un éternuement fait pousser des fleurs géantes. Un battement d’aile soulève Galet de dix centimètres, ce qui constitue probablement un record.',
                    'Puis une bulle géante enferme Zéphyr. Il flotte à l’intérieur en criant qu’il maîtrise parfaitement la situation, ce qui est manifestement faux.',
                    'Naïm voit surtout que Méli-Mélo regarde derrière elle à chaque accident, de plus en plus paniquée par ce qu’elle provoque.'
                ],
                'prompt':'Que fait Naïm pendant la poursuite ?','choices':['Rassurer Méli-Mélo à distance','Aider d’abord les amis touchés par sa magie','Essayer de prévoir quel pouvoir va se déclencher ensuite'],
                'results':['La créature ralentit légèrement lorsqu’elle entend Naïm.','Naïm libère Zéphyr de sa bulle et vérifie que personne n’est blessé.','En observant ses mouvements, Naïm comprend que les oreilles lumineuses annoncent les décharges de magie.'],
                'scores':[(1,1,1,3),(1,0,0,3),(0,0,3,1)]
            },
            {
                'title':'Tous les animaux reviennent','icon':'🐾',
                'pages':[
                    'Des portails s’ouvrent autour de la grande prairie. Flamme arrive avec plusieurs dragons. Mélodie et les créatures du lac nagent dans l’air au-dessus d’eux.',
                    'Bouboule descend d’un nuage avec les oiseaux des îles. Galet atteint la prairie beaucoup plus tard, mais personne n’avait réellement douté qu’il viendrait.',
                    'Tous reconnaissent une partie de leur ancienne magie à l’intérieur de Méli-Mélo. Au lieu de l’encercler, ils s’assoient à distance.'
                ],
                'prompt':'Comment Naïm organise-t-il les animaux ?','choices':['Chaque groupe appelle doucement sa propre magie','Tout le monde reste silencieux pour ne pas effrayer Méli-Mélo','Naïm s’approche seul pendant que les animaux restent visibles'],
                'results':['Des flammes douces, des chants et des lumières familières attirent l’attention de Méli-Mélo.','Le calme de la prairie fait enfin ralentir sa respiration.','Méli-Mélo regarde Naïm, puis les animaux derrière lui. Elle ne fuit pas.'],
                'scores':[(1,0,2,3),(0,0,0,3),(2,1,1,2)]
            },
            {
                'title':'Rendre ce qui ne lui appartient pas','icon':'✨',
                'pages':[
                    'Naïm pose la plume impossible au sol. Elle s’illumine et projette de petits chemins de lumière entre Méli-Mélo et les animaux.',
                    'Une flamme rouge quitte doucement sa queue et retourne vers les dragons. Une note bleue rejoint Mélodie. Un souffle blanc monte vers les îles du ciel.',
                    'À chaque pouvoir rendu, Méli-Mélo devient un peu plus petite. Mais elle ne disparaît pas. Sous la magie empruntée existe une vraie petite créature, unique.'
                ],
                'prompt':'Comment Naïm accompagne-t-il Méli-Mélo ?','choices':['Rester près d’elle jusqu’à la fin','Laisser chaque animal venir la remercier','Demander à Orphéo de l’aider à guider les derniers pouvoirs'],
                'results':['Naïm garde une main près de sa patte jusqu’à ce que les tremblements cessent.','Les animaux s’approchent un à un. Méli-Mélo comprend qu’ils ne lui en veulent pas.','Orphéo utilise enfin son savoir pour rendre la magie au lieu de la capturer.'],
                'scores':[(1,0,0,3),(0,0,1,3),(1,0,1,3)]
            },
            {
                'title':'Orphéo ouvre les portes','icon':'🔓',
                'pages':[
                    'Quand le dernier pouvoir revient à son propriétaire, Orphéo regarde le petit Méli-Mélo endormi contre Naïm.',
                    'Il sort toutes les clés de la Ménagerie. « Je voulais qu’aucun animal ne disparaisse jamais. J’ai fini par oublier qu’une vie sans choix n’est pas une vie protégée. »',
                    'Orphéo ouvre lui-même les dernières portes. Maître Hibou lui propose de rester pour réparer les refuges et reconstruire la confiance, mais pas de redevenir Gardien immédiatement.'
                ],
                'prompt':'Que dit Naïm à Orphéo ?','choices':['“Réparer prendra du temps, mais tu peux commencer aujourd’hui.”','“Tu devrais écouter les animaux avant chaque décision.”','“On pourrait aussi continuer à chercher Pim.”'],
                'results':['Orphéo acquiesce et commence par démonter son premier appareil de capture.','Orphéo demande aux créatures ce qu’elles veulent faire des anciens refuges.','Pour la première fois depuis longtemps, Orphéo sourit un peu. « Oui. Peut-être. »'],
                'scores':[(0,0,0,3),(0,0,1,3),(0,0,2,3)]
            },
            {
                'title':'La plume dorée','icon':'🌟',
                'pages':[
                    'Quelques jours plus tard, le Grand Bestiaire a retrouvé ses couleurs. Les dragons réchauffent leur vallée, le lac chante à nouveau et les îles flottent haut dans le ciel.',
                    'Nox raccompagne Naïm jusqu’à la porte dans l’arbre. « Les humains ne voient normalement jamais ce passage », dit-il. Naïm sourit : « Avec moi, arrête de dire normalement. »',
                    'Naïm rentre dans son jardin. La porte disparaît. Puis une gigantesque plume dorée tombe lentement du ciel. Très loin au-dessus des nuages, un immense ROOOAAAR résonne. Naïm lève les yeux. Cette aventure est terminée… mais le Grand Bestiaire possède encore beaucoup de secrets.'
                ],
                'prompt':'Quel souvenir Naïm choisit-il de garder de cette aventure ?','choices':['La plume dorée comme promesse de revenir','La clé des Gardiens comme rappel que protéger, c’est aussi ouvrir','Le petit médaillon d’Orphéo comme promesse de chercher Pim'],
                'results':['La plume brille une dernière fois dans la main de Naïm.','La clé devient minuscule et se transforme en pendentif argenté.','Le médaillon chauffe doucement, comme si quelque part une autre histoire venait de commencer.'],
                'scores':[(2,0,2,1),(1,0,1,3),(1,0,2,3)]
            },
        ]
    },
]

book = {
    'title':'Naïm et les Animaux Fantastiques','subtitle':'Le Grand Bestiaire','age':'6 ans',
    'pageCount':240,'sceneCount':60,'choiceCount':180,'chapters':[],
    'specialItems':{'0':'🪶 Plume impossible','5':'💎 Fragment de cristal','11':'🎭 Éclat du masque blanc','17':'❤️‍🔥 Éclat du Grand Cristal du Feu','23':'🎵 Cristal de chant bleu','29':'🏅 Médaillon des Gardiens','35':'🗺️ Plan de la Ménagerie','41':'🗝️ Clé des Gardiens','47':'📜 Page du journal d’Orphéo','53':'🌈 Éclat de Méli-Mélo','59':'🪶 Plume dorée'}
}
score_map=[]
scene_index=0
for ci, ch in enumerate(chapters):
    out_ch={k:ch[k] for k in ['title','world','icon','caption','color']}
    out_ch['index']=ci; out_ch['pageStart']=ci*24+1; out_ch['pageEnd']=(ci+1)*24; out_ch['scenes']=[]
    for s in ch['scenes']:
        assert len(s['pages'])==3 and len(s['choices'])==3 and len(s['results'])==3 and len(s['scores'])==3
        out_s={k:s[k] for k in ['title','pages','prompt','choices','results','icon']}
        out_s['sceneIndex']=scene_index; out_s['pageStart']=scene_index*4+1; out_s['pageEnd']=scene_index*4+4
        out_ch['scenes'].append(out_s); score_map.append([list(v) for v in s['scores']]); scene_index += 1
    book['chapters'].append(out_ch)
assert len(book['chapters'])==10 and all(len(c['scenes'])==6 for c in book['chapters'])
flat=[s for c in book['chapters'] for s in c['scenes']]
assert len(flat)==60 and sum(len(s['pages']) for s in flat)==180 and sum(len(s['choices']) for s in flat)==180
assert len(score_map)==60 and sum(len(x) for x in score_map)==180
assert all(len(v)==4 and all(0<=n<=3 for n in v) for scene in score_map for v in scene)
bookp.write_text(json.dumps(book, ensure_ascii=False, indent=2), encoding='utf-8')
bookdatap.write_text('window.NAIM_BOOK_DATA = ' + json.dumps(book, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')

audit=[]
for si,s in enumerate(flat):
    for ci,choice in enumerate(s['choices']):
        c,f,u,k=score_map[si][ci]
        audit.append({'sceneIndex':si,'scene':s['title'],'choiceIndex':ci,'choice':choice,'scores':{'courage':c,'fear':f,'curiosity':u,'kindness':k}})
(assets/'scoring-animaux-v1.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding='utf-8')

html=indexp.read_text(encoding='utf-8')
html=html.replace('Naïm et les Mondes Impossibles','Naïm et les Animaux Fantastiques')
html=html.replace('Naïm et les<br><strong>Mondes Impossibles</strong>','Naïm et les<br><strong>Animaux Fantastiques</strong>')
html=html.replace('Le Cœur des Mondes','Le Grand Bestiaire')
html=html.replace('<div class="cover-door" aria-hidden="true"><span>✦</span></div>','<div class="cover-door" aria-hidden="true"><span>🪶</span></div>')
html=html.replace('La porte dans la chambre','La plume impossible').replace('TOC ! TOC ! sous le lit','Une plume sur la fenêtre')
html=html.replace('<p class="eyebrow">FIN DU TOME 1</p>','<p class="eyebrow">FIN</p>').replace('Naïm, Gardien des Mondes','Naïm, Ami du Grand Bestiaire')
indexp.write_text(html, encoding='utf-8')

js=appjsp.read_text(encoding='utf-8')
js=js.replace("const SAVE_KEY = 'naim_mondes_save_v1';", "const SAVE_KEY = 'naim_animaux_fantastiques_save_v1';")
js=js.replace("const items = ['🧦 Chaussette jaune'];", "const items = [];")
score_js=json.dumps(score_map, ensure_ascii=False, separators=(',',':'))
js=re.sub(r'const SCORE_MAP = \[.*?\];\n  const SCORE_MAX', 'const SCORE_MAP = '+score_js+';\n  const SCORE_MAX', js, count=1, flags=re.S)
finish_pat=r"  function finish\(\)\{.*?\n  \}\n\n  \$\('startBtn'\)"
finish_new=r'''  function finish(){
    state.finished=true; save();
    const p=getAdventureProfile();
    const l=p.levels;
    const ranked=[['courage',l.courage],['fear',l.fear],['curiosity',l.curiosity],['kindness',l.kindness]].sort((a,b)=>b[1]-a[1]);
    let title, text, icon='🐾';
    if(l.courage>=5 && l.curiosity>=5 && l.kindness>=5){ title='Naïm, Ami du Grand Bestiaire'; text='Naïm a avancé malgré les surprises, observé les mystères et surtout écouté les animaux. Le Grand Bestiaire sait désormais qu’il peut compter sur lui.'; icon='🌟'; }
    else if(ranked[0][0]==='kindness'){ title='Naïm, Protecteur au grand cœur'; text='Naïm a souvent choisi d’aider, de rassurer et de laisser les animaux décider pour eux-mêmes. C’est exactement ce dont le Grand Bestiaire avait besoin.'; icon='💛'; }
    else if(ranked[0][0]==='curiosity'){ title='Naïm, Explorateur du Grand Bestiaire'; text='Naïm a observé les traces, posé les bonnes questions et cherché à comprendre Orphéo avant de le juger. Peu de secrets lui échappent.'; icon='🔎'; }
    else if(ranked[0][0]==='fear'){ title='Naïm, courageux même quand il a peur'; text='Naïm a parfois eu peur face aux dragons, aux hauteurs et aux pouvoirs incontrôlables. Il a appris qu’on peut avoir peur et continuer quand on se sent prêt.'; icon='🌙'; }
    else { title='Naïm, Aventurier des Animaux Fantastiques'; text='Naïm a souvent choisi d’agir et d’avancer vers l’inconnu. Même les portes du Grand Bestiaire ne lui font plus tourner les talons.'; icon='🪶'; }
    const finalChoice=state.choices[59];
    if(finalChoice===0) text += ' Il garde la plume dorée comme promesse de revenir.';
    if(finalChoice===1) text += ' Il garde la petite clé comme rappel qu’on protège mieux en ouvrant des chemins qu’en fermant des cages.';
    if(finalChoice===2) text += ' Il garde le médaillon et la promesse de chercher un jour ce qui est arrivé à Pim.';
    $('endingIcon').textContent=icon; $('endingTitle').textContent=title; $('endingText').textContent=text;
    const profileBox=$('endingProfile');
    if(profileBox){ profileBox.innerHTML=`<h3>⭐ Ton aventure</h3><p>Voici les vrais points gagnés avec tes 60 décisions.</p><div class="ending-profile-values"><span>🦁 ${p.courage} pts</span><span>🌙 ${p.fear} pts</span><span>🔎 ${p.curiosity} pts</span><span>💛 ${p.kindness} pts</span></div>`; }
    show('endingScreen');
  }

  $('startBtn')'''
js2=re.sub(finish_pat, finish_new, js, count=1, flags=re.S)
if js2==js: raise SystemExit('finish() replacement failed')
appjsp.write_text(js2, encoding='utf-8')

g=gradlep.read_text(encoding='utf-8')
g=re.sub(r"applicationId '[^']+'", "applicationId 'com.naim.animauxfantastiques'", g, count=1)
g=re.sub(r'versionCode\s+\d+', 'versionCode 1', g, count=1)
g=re.sub(r"versionName '[^']+'", "versionName '1.0.0'", g, count=1)
gradlep.write_text(g, encoding='utf-8')
stringsp.write_text('<resources>\n    <string name="app_name">Naïm et les Animaux Fantastiques</string>\n</resources>\n', encoding='utf-8')
readmep.write_text('# Naïm et les Animaux Fantastiques\n\nLivre-jeu Android hors ligne pour enfant de 6 ans.\n\n- 240 pages conceptuelles\n- 10 chapitres\n- 60 scènes\n- 180 choix\n- scoring explicite Courage / Peur / Curiosité / Gentillesse\n- narration française TTS\n- sauvegarde automatique\n- sans illustrations\n- sans cherche-et-trouve\n\nPackage Android : `com.naim.animauxfantastiques`\nVersion : 1.0.0\n', encoding='utf-8')
out=root/'Naim_Animaux_Fantastiques_Android_v1.0_Source.zip'
if out.exists(): out.unlink()
shutil.make_archive(str(out.with_suffix('')), 'zip', root_dir=root/'buildsrc-v11', base_dir='Naim_Mondes_Impossibles_Android')
reloaded=json.loads(bookp.read_text(encoding='utf-8'))
assert reloaded['title']=='Naïm et les Animaux Fantastiques' and reloaded['pageCount']==240 and reloaded['sceneCount']==60 and reloaded['choiceCount']==180
assert len([s for c in reloaded['chapters'] for s in c['scenes']])==60 and sum(len(s['choices']) for c in reloaded['chapters'] for s in c['scenes'])==180
assert len(json.loads((assets/'scoring-animaux-v1.json').read_text(encoding='utf-8')))==180
ui=indexp.read_text(encoding='utf-8')+appjsp.read_text(encoding='utf-8')
for token in ['pageArtImage','objectHotspot','searchMission','HIDDEN_OBJECTS','PAGE_ILLUSTRATIONS','Cherche dans les images','id="art"']: assert token not in ui, token
assert "const items = [];" in js2 and 'naim_animaux_fantastiques_save_v1' in js2
assert 'Orphéo' in json.dumps(reloaded,ensure_ascii=False) and 'Méli-Mélo' in json.dumps(reloaded,ensure_ascii=False)
assert "applicationId 'com.naim.animauxfantastiques'" in g and "versionName '1.0.0'" in g
print('NAIM ANIMAUX FANTASTIQUES V1.0 OK: 240 pages / 60 scenes / 180 explicit choices / no images / no search-and-find')
