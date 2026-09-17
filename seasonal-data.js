const SEASONAL_DATA = {
  spring: {
    label: 'Spring',
    subtitle: 'Species drawn from Lectio Terra, this season',
    entries: [
      { title: "Pink lady's slipper", latin: 'Cypripedium acaule', body: 'A woodland orchid keeps its flowering close to the forest floor, where the season is still learning how to speak. Its color arrives before the canopy has entirely remembered its leaves.', phenomena: 'A first study in the patient intelligence of emergence.' },
      { title: 'Common lilac', latin: 'Syringa vulgaris', body: 'Common lilac marks the season by scent as much as by flower. Its brief abundance makes a familiar path feel newly discovered.', phenomena: "A garden's old perfume, carried farther than sight." },
      { title: 'Ostrich fern', latin: 'Matteuccia struthiopteris', body: 'The ostrich fern gathers itself from the wet margins of streams and woods, each fiddlehead keeping its spiral until the season asks it to open.', phenomena: 'A green architecture rising from damp ground.' }
    ],
    species: [
      ['Pink lady\'s slipper', 'Cypripedium acaule'], ['Common lilac', 'Syringa vulgaris'], ['Ostrich fern', 'Matteuccia struthiopteris'], ['Red maple', 'Acer rubrum'], ['Trillium', 'Trillium grandiflorum'], ['Columbine', 'Aquilegia canadensis'], ['Mayapple', 'Podophyllum peltatum'], ['Jack-in-the-pulpit', 'Arisaema triphyllum'], ['Bloodroot', 'Sanguinaria canadensis'], ['Dutchman\'s breeches', 'Dicentra cucullaria'], ['Serviceberry', 'Amelanchier canadensis'], ['Spring beauty', 'Claytonia virginica']
    ]
  },
  summer: {
    label: 'Summer',
    subtitle: 'Species drawn from Lectio Terra, this season',
    entries: [
      { title: 'Butterfly weed', latin: 'Asclepias tuberosa', body: 'Butterfly weed holds its color in open ground, where heat and movement collect around a flower made for many visitors.', phenomena: 'An orange gathering place for wings and weather.' },
      { title: 'Common reed', latin: 'Phragmites australis', body: 'At the margin of a pond, common reed turns the smallest wind into a visible field of movement.', phenomena: 'A tall grass listening at the edge of water.' },
      { title: 'Sheet moss', latin: 'Hypnum imponens', body: 'Sheet moss keeps close to stone, soil, and fallen wood, making a soft register for the moisture held beneath the summer heat.', phenomena: "A low green fabric beneath the season's taller voices." }
    ],
    species: [
      ['Butterfly weed', 'Asclepias tuberosa'], ['Common reed', 'Phragmites australis'], ['Sheet moss', 'Hypnum imponens'], ['Black-eyed Susan', 'Rudbeckia hirta'], ['Wild bergamot', 'Monarda fistulosa'], ['Joe-Pye weed', 'Eutrochium purpureum'], ['Queen Anne\'s lace', 'Daucus carota'], ['Milkweed', 'Asclepias syriaca'], ['Blue vervain', 'Verbena hastata'], ['Bee balm', 'Monarda didyma'], ['Yarrow', 'Achillea millefolium'], ['Fireweed', 'Chamerion angustifolium']
    ]
  },
  autumn: {
    label: 'Autumn',
    subtitle: 'Species drawn from Lectio Terra, this season',
    entries: [
      { title: 'Sugar maple', latin: 'Acer saccharum', body: 'Sugar maple turns the year into color, each leaf briefly holding the sun before returning it to the ground.', phenomena: 'A tree that makes the shortening day visible.' },
      { title: 'Paper birch', latin: 'Betula papyrifera', body: 'Paper birch keeps a pale trunk among the thinning leaves, a visible line between the forest\'s present and what it is becoming.', phenomena: 'White bark, dark branches, and the first clear grammar of winter.' },
      { title: 'Corn', latin: 'Zea mays', body: 'Corn makes harvest legible: a field\'s height becomes food, seed, and the promise of another season.', phenomena: 'A cultivated abundance held in rows and husks.' }
    ],
    species: [
      ['Sugar maple', 'Acer saccharum'], ['Paper birch', 'Betula papyrifera'], ['Corn', 'Zea mays'], ['White oak', 'Quercus alba'], ['American beech', 'Fagus grandifolia'], ['Sumac', 'Rhus typhina'], ['Goldenrod', 'Solidago canadensis'], ['New England aster', 'Symphyotrichum novae-angliae'], ['Pawpaw', 'Asimina triloba'], ['Black walnut', 'Juglans nigra'], ['Highbush blueberry', 'Vaccinium corymbosum'], ['Cranberry', 'Vaccinium macrocarpon']
    ]
  },
  winter: {
    label: 'Winter',
    subtitle: 'Species drawn from Lectio Terra, this season',
    entries: [
      { title: 'Witch hazel', latin: 'Hamamelis virginiana', body: 'Witch hazel keeps its yellow flowers until the leaves have gone, a small brightness arriving when the woods appear to have finished speaking.', phenomena: 'A late flower, insisting that dormancy is not stillness.' },
      { title: 'Red currant', latin: 'Ribes rubrum', body: "Red currant belongs to the season's memory: fruit gone, stems bare, and the next year's growth already held in the buds.", phenomena: 'A remembered fruit, held in the bare architecture of the shrub.' },
      { title: 'Eastern hemlock', latin: 'Tsuga canadensis', body: 'Eastern hemlock keeps a dark green presence through the cold months, gathering snow and quiet in its layered branches.', phenomena: 'A deep green patience beneath the weather.' }
    ],
    species: [
      ['Witch hazel', 'Hamamelis virginiana'], ['Red currant', 'Ribes rubrum'], ['Eastern hemlock', 'Tsuga canadensis'], ['White pine', 'Pinus strobus'], ['Red cedar', 'Juniperus virginiana'], ['Winterberry', 'Ilex verticillata'], ['Mountain laurel', 'Kalmia latifolia'], ['Christmas fern', 'Polystichum acrostichoides'], ['American holly', 'Ilex opaca'], ['Paper wasp gall', 'Rhopalomyia solidaginis'], ['Snowberry', 'Symphoricarpos albus'], ['Juniper', 'Juniperus communis']
    ]
  }
};

const SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter'];

function currentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}
