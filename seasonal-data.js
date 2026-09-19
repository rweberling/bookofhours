const SEASONAL_DATA = {
spring: {
label: 'Spring',
subtitle: 'Species drawn from Lectio Terra, this season',
species: [
['Pink lady\'s slipper', 'Cypripedium acaule'], ['Common lilac', 'Syringa vulgaris'], ['Ostrich fern', 'Matteuccia struthiopteris'], ['Red maple', 'Acer rubrum'], ['Trillium', 'Trillium grandiflorum'], ['Columbine', 'Aquilegia canadensis'], ['Mayapple', 'Podophyllum peltatum'], ['Jack-in-the-pulpit', 'Arisaema triphyllum'], ['Bloodroot', 'Sanguinaria canadensis'], ['Dutchman\'s breeches', 'Dicentra cucullaria'], ['Serviceberry', 'Amelanchier canadensis'], ['Spring beauty', 'Claytonia virginica']
]
},
summer: {
label: 'Summer',
subtitle: 'Species drawn from Lectio Terra, this season',
species: [
['Butterfly weed', 'Asclepias tuberosa'], ['Common reed', 'Phragmites australis'], ['Sheet moss', 'Hypnum imponens'], ['Black-eyed Susan', 'Rudbeckia hirta'], ['Wild bergamot', 'Monarda fistulosa'], ['Joe-Pye weed', 'Eutrochium purpureum'], ['Queen Anne\'s lace', 'Daucus carota'], ['Milkweed', 'Asclepias syriaca'], ['Blue vervain', 'Verbena hastata'], ['Bee balm', 'Monarda didyma'], ['Yarrow', 'Achillea millefolium'], ['Fireweed', 'Chamerion angustifolium']
]
},
autumn: {
label: 'Autumn',
subtitle: 'Species drawn from Lectio Terra, this season',
species: [
['Sugar maple', 'Acer saccharum'], ['Paper birch', 'Betula papyrifera'], ['Corn', 'Zea mays'], ['White oak', 'Quercus alba'], ['American beech', 'Fagus grandifolia'], ['Sumac', 'Rhus typhina'], ['Goldenrod', 'Solidago canadensis'], ['New England aster', 'Symphyotrichum novae-angliae'], ['Pawpaw', 'Asimina triloba'], ['Black walnut', 'Juglans nigra'], ['Highbush blueberry', 'Vaccinium corymbosum'], ['Cranberry', 'Vaccinium macrocarpon']
]
},
winter: {
label: 'Winter',
subtitle: 'Species drawn from Lectio Terra, this season',
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