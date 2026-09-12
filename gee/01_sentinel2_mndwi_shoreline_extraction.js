// ========================================
// PILOT STUDY - STEP 1
// Cox's Bazar Coastal Reach
// Sentinel-2 image availability: 2021-2023
// ========================================

// AOI
var aoi = geometry;

Map.centerObject(aoi, 13);

Map.addLayer(
  aoi,
  {color: 'red'},
  'Pilot AOI'
);


// ========================================
// Sentinel-2 Surface Reflectance
// ========================================

var s2 = ee.ImageCollection(
  'COPERNICUS/S2_SR_HARMONIZED'
)
.filterBounds(aoi)
.filterDate(
  '2021-01-01',
  '2024-01-01'
)
.filter(
  ee.Filter.lt(
    'CLOUDY_PIXEL_PERCENTAGE',
    40
  )
);


// ========================================
// Check Image Availability
// ========================================

print(
  'Total Sentinel-2 images (2021-2023):',
  s2.size()
);

print(
  'Sentinel-2 collection:',
  s2
);
// ========================================
// STEP 2
// SEASON-WISE SENTINEL-2 IMAGE AVAILABILITY
// ========================================

// We use:
// Dry / Winter      = January - February
// Pre-monsoon       = March - May
// Monsoon           = June - September
// Post-monsoon      = October - December


// ---------- 2021 ----------
var dry2021 = s2.filterDate('2021-01-01', '2021-03-01');
var pre2021 = s2.filterDate('2021-03-01', '2021-06-01');
var monsoon2021 = s2.filterDate('2021-06-01', '2021-10-01');
var post2021 = s2.filterDate('2021-10-01', '2022-01-01');


// ---------- 2022 ----------
var dry2022 = s2.filterDate('2022-01-01', '2022-03-01');
var pre2022 = s2.filterDate('2022-03-01', '2022-06-01');
var monsoon2022 = s2.filterDate('2022-06-01', '2022-10-01');
var post2022 = s2.filterDate('2022-10-01', '2023-01-01');


// ---------- 2023 ----------
var dry2023 = s2.filterDate('2023-01-01', '2023-03-01');
var pre2023 = s2.filterDate('2023-03-01', '2023-06-01');
var monsoon2023 = s2.filterDate('2023-06-01', '2023-10-01');
var post2023 = s2.filterDate('2023-10-01', '2024-01-01');


// ========================================
// PRINT RESULTS
// ========================================

print('========== 2021 ==========');
print('Dry 2021:', dry2021.size());
print('Pre-monsoon 2021:', pre2021.size());
print('Monsoon 2021:', monsoon2021.size());
print('Post-monsoon 2021:', post2021.size());


print('========== 2022 ==========');
print('Dry 2022:', dry2022.size());
print('Pre-monsoon 2022:', pre2022.size());
print('Monsoon 2022:', monsoon2022.size());
print('Post-monsoon 2022:', post2022.size());


print('========== 2023 ==========');
print('Dry 2023:', dry2023.size());
print('Pre-monsoon 2023:', pre2023.size());
print('Monsoon 2023:', monsoon2023.size());
print('Post-monsoon 2023:', post2023.size());
// ========================================
// STEP 3
// AOI-SPECIFIC CLOUD SCREENING
// ========================================

// Sentinel-2 Cloud Probability
var s2CloudProb = ee.ImageCollection(
  'COPERNICUS/S2_CLOUD_PROBABILITY'
)
.filterBounds(aoi)
.filterDate('2021-01-01', '2024-01-01');


// ----------------------------------------
// Join Sentinel-2 with Cloud Probability
// ----------------------------------------

var joinedS2 = ee.Join.saveFirst('cloud_mask').apply({
  primary: s2,
  secondary: s2CloudProb,
  condition: ee.Filter.equals({
    leftField: 'system:index',
    rightField: 'system:index'
  })
});


// ----------------------------------------
// Calculate AOI Cloud Percentage
// ----------------------------------------

var s2CloudChecked = ee.ImageCollection(joinedS2)
.map(function(image) {

  var cloudProb = ee.Image(
    image.get('cloud_mask')
  ).select('probability');

  // Cloud probability >= 40 = cloud
  var cloudMask = cloudProb.gte(40);

  // Mean cloud fraction inside our AOI
  var cloudStats = cloudMask.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: aoi,
    scale: 20,
    maxPixels: 1e9
  });

  var aoiCloudPercent = ee.Number(
    cloudStats.get('probability')
  ).multiply(100);

  return image.set(
    'AOI_CLOUD_PERCENT',
    aoiCloudPercent
  );
});


// ========================================
// Print first results
// ========================================

print(
  'AOI cloud-screened Sentinel-2:',
  s2CloudChecked
);

print(
  'Images with AOI cloud < 20%:',
  s2CloudChecked.filter(
    ee.Filter.lt('AOI_CLOUD_PERCENT', 20)
  ).size()
);

print(
  'Images with AOI cloud < 30%:',
  s2CloudChecked.filter(
    ee.Filter.lt('AOI_CLOUD_PERCENT', 30)
  ).size()
);
// ========================================
// STEP 4
// FIND BEST IMAGES FOR EACH SEASON
// ========================================

// We will keep images with AOI cloud < 20%

var goodS2 = s2CloudChecked
  .filter(ee.Filter.lt('AOI_CLOUD_PERCENT', 20));


// ========================================
// Function to print image information
// ========================================

function printSeasonImages(name, start, end) {

  var collection = goodS2
    .filterDate(start, end)
    .sort('AOI_CLOUD_PERCENT');

  print(
    '----------------------------------------'
  );

  print(name, collection.size());

  print(
    name + ' - Date & AOI Cloud %',
    collection.map(function(image) {

      return ee.Feature(null, {
        'Date': ee.Date(
          image.get('system:time_start')
        ).format('YYYY-MM-dd'),

        'AOI_Cloud_%': image.get(
          'AOI_CLOUD_PERCENT'
        ),

        'Scene_Cloud_%': image.get(
          'CLOUDY_PIXEL_PERCENTAGE'
        )
      });

    })
  );
}


// ========================================
// 2021
// ========================================

printSeasonImages(
  'Dry 2021',
  '2021-01-01',
  '2021-03-01'
);

printSeasonImages(
  'Pre-monsoon 2021',
  '2021-03-01',
  '2021-06-01'
);

printSeasonImages(
  'Monsoon 2021',
  '2021-06-01',
  '2021-10-01'
);

printSeasonImages(
  'Post-monsoon 2021',
  '2021-10-01',
  '2022-01-01'
);


// ========================================
// 2022
// ========================================

printSeasonImages(
  'Dry 2022',
  '2022-01-01',
  '2022-03-01'
);

printSeasonImages(
  'Pre-monsoon 2022',
  '2022-03-01',
  '2022-06-01'
);

printSeasonImages(
  'Monsoon 2022',
  '2022-06-01',
  '2022-10-01'
);

printSeasonImages(
  'Post-monsoon 2022',
  '2022-10-01',
  '2023-01-01'
);


// ========================================
// 2023
// ========================================

printSeasonImages(
  'Dry 2023',
  '2023-01-01',
  '2023-03-01'
);

printSeasonImages(
  'Pre-monsoon 2023',
  '2023-03-01',
  '2023-06-01'
);

printSeasonImages(
  'Monsoon 2023',
  '2023-06-01',
  '2023-10-01'
);

printSeasonImages(
  'Post-monsoon 2023',
  '2023-10-01',
  '2024-01-01'
);
// ========================================
// STEP 5
// TOP 3 CANDIDATE IMAGES FOR EACH SEASON
// ========================================

// Keep only images with AOI cloud < 20%
var goodS2 = s2CloudChecked
  .filter(ee.Filter.lt('AOI_CLOUD_PERCENT', 20));


// ----------------------------------------
// Function to show Top 3 images
// ----------------------------------------

function showTop3(name, start, end) {

  var collection = goodS2
    .filterDate(start, end)
    .sort('AOI_CLOUD_PERCENT')
    .limit(3);

  var info = collection.map(function(image) {

    return ee.Feature(null, {

      'Date': ee.Date(
        image.get('system:time_start')
      ).format('YYYY-MM-dd'),

      'AOI_Cloud_%': ee.Number(
        image.get('AOI_CLOUD_PERCENT')
      ).format('%.2f'),

      'Scene_Cloud_%': ee.Number(
        image.get('CLOUDY_PIXEL_PERCENTAGE')
      ).format('%.2f'),

      'Image_ID': image.get('system:index')
    });

  });

  print('========== ' + name + ' ==========', info);
}


// ========================================
// 2021
// ========================================

showTop3(
  'Dry 2021',
  '2021-01-01',
  '2021-03-01'
);

showTop3(
  'Pre-monsoon 2021',
  '2021-03-01',
  '2021-06-01'
);

showTop3(
  'Monsoon 2021',
  '2021-06-01',
  '2021-10-01'
);

showTop3(
  'Post-monsoon 2021',
  '2021-10-01',
  '2022-01-01'
);


// ========================================
// 2022
// ========================================

showTop3(
  'Dry 2022',
  '2022-01-01',
  '2022-03-01'
);

showTop3(
  'Pre-monsoon 2022',
  '2022-03-01',
  '2022-06-01'
);

showTop3(
  'Monsoon 2022',
  '2022-06-01',
  '2022-10-01'
);

showTop3(
  'Post-monsoon 2022',
  '2022-10-01',
  '2023-01-01'
);


// ========================================
// 2023
// ========================================

showTop3(
  'Dry 2023',
  '2023-01-01',
  '2023-03-01'
);

showTop3(
  'Pre-monsoon 2023',
  '2023-03-01',
  '2023-06-01'
);

showTop3(
  'Monsoon 2023',
  '2023-06-01',
  '2023-10-01'
);

showTop3(
  'Post-monsoon 2023',
  '2023-10-01',
  '2024-01-01'
);
// ========================================
// STEP 6
// MNDWI VISUAL CHECK - DRY 2021
// ========================================

// Select the best (lowest AOI cloud) image
// from Dry 2021

var bestDry2021 = s2CloudChecked
  .filter(ee.Filter.lt('AOI_CLOUD_PERCENT', 20))
  .filterDate('2021-01-01', '2021-03-01')
  .sort('AOI_CLOUD_PERCENT')
  .first();


// Print image information
print(
  'BEST DRY 2021 IMAGE:',
  bestDry2021
);

print(
  'Dry 2021 Date:',
  ee.Date(
    bestDry2021.get('system:time_start')
  ).format('YYYY-MM-dd')
);

print(
  'Dry 2021 AOI Cloud %:',
  bestDry2021.get('AOI_CLOUD_PERCENT')
);


// ========================================
// Calculate MNDWI
// MNDWI = (Green - SWIR) / (Green + SWIR)
// Sentinel-2:
// Green = B3
// SWIR  = B11
// ========================================

var mndwiDry2021 = bestDry2021
  .normalizedDifference(['B3', 'B11'])
  .rename('MNDWI');


// ========================================
// Display MNDWI
// ========================================

Map.centerObject(aoi, 12);

Map.addLayer(
  mndwiDry2021.clip(aoi),
  {
    min: -0.5,
    max: 0.8,
    palette: [
      'brown',
      'yellow',
      'white',
      'cyan',
      'blue'
    ]
  },
  'MNDWI - Dry 2021'
);
// ========================================
// STEP 6B
// RGB + MNDWI VISUAL QUALITY CHECK
// ========================================

// True Color RGB
Map.addLayer(
  bestDry2021.clip(aoi),
  {
    bands: ['B4', 'B3', 'B2'],
    min: 0,
    max: 3000
  },
  'RGB - Dry 2021'
);


// MNDWI
Map.addLayer(
  mndwiDry2021.clip(aoi),
  {
    min: -0.5,
    max: 0.8,
    palette: [
      'brown',
      'yellow',
      'white',
      'cyan',
      'blue'
    ]
  },
  'MNDWI - Dry 2021'
);


// ----------------------------------------
// Simple water mask for VISUAL CHECK ONLY
// ----------------------------------------

var waterMaskDry2021 = mndwiDry2021.gt(0);

Map.addLayer(
  waterMaskDry2021.selfMask().clip(aoi),
  {
    palette: ['blue']
  },
  'Water Mask - MNDWI > 0'
);
// ========================================
// STEP 7
// AUTOMATIC OTSU THRESHOLD FOR MNDWI
// ========================================

// Create histogram of MNDWI values
var histogram = mndwiDry2021.reduceRegion({
  reducer: ee.Reducer.histogram({
    maxBuckets: 256
  }),
  geometry: aoi,
  scale: 10,
  bestEffort: true,
  maxPixels: 1e9
});


// ========================================
// OTSU FUNCTION
// ========================================

function otsu(histogram) {

  var counts = ee.Array(
    ee.Dictionary(histogram).get('histogram')
  );

  var means = ee.Array(
    ee.Dictionary(histogram).get('bucketMeans')
  );

  var size = means.length().get([0]);

  var total = counts.reduce(
    ee.Reducer.sum(),
    [0]
  ).get([0]);

  var sum = means.multiply(counts).reduce(
    ee.Reducer.sum(),
    [0]
  ).get([0]);

  var mean = sum.divide(total);


  var indices = ee.List.sequence(
    1,
    ee.Number(size).subtract(1)
  );


  var bss = indices.map(function(i) {

    i = ee.Number(i);

    var counts1 = counts
      .slice(0, 0, i);

    var means1 = means
      .slice(0, 0, i);

    var w1 = counts1.reduce(
      ee.Reducer.sum(),
      [0]
    ).get([0]);

    var w2 = total.subtract(w1);

    var m1 = means1.multiply(counts1)
      .reduce(
        ee.Reducer.sum(),
        [0]
      )
      .get([0])
      .divide(w1);

    var m2 = sum.subtract(
      means1.multiply(counts1)
        .reduce(
          ee.Reducer.sum(),
          [0]
        )
        .get([0])
    ).divide(w2);

    return w1.multiply(
      m1.subtract(mean).pow(2)
    ).add(
      w2.multiply(
        m2.subtract(mean).pow(2)
      )
    );

  });


  var maxIndex = ee.Array(bss)
    .argmax()
    .get([0]);

  return means.get([maxIndex]);
}



// ========================================
// STEP 7
// SEASONAL MNDWI EXPORT
// PILOT: 2021-2023
// ========================================

// AOI cloud < 20%
var goodS2 = s2CloudChecked
  .filter(ee.Filter.lt('AOI_CLOUD_PERCENT', 20));


// ========================================
// Function: get best image
// ========================================

function getBest(start, end) {

  return goodS2
    .filterDate(start, end)
    .sort('AOI_CLOUD_PERCENT')
    .first();
}


// ========================================
// BEST IMAGE FOR EACH SEASON
// ========================================

// 2021
var dry21 = getBest('2021-01-01', '2021-03-01');
var pre21 = getBest('2021-03-01', '2021-06-01');
var mon21 = getBest('2021-06-01', '2021-10-01');
var post21 = getBest('2021-10-01', '2022-01-01');

// 2022
var dry22 = getBest('2022-01-01', '2022-03-01');
var pre22 = getBest('2022-03-01', '2022-06-01');
var mon22 = getBest('2022-06-01', '2022-10-01');
var post22 = getBest('2022-10-01', '2023-01-01');

// 2023
var dry23 = getBest('2023-01-01', '2023-03-01');
var pre23 = getBest('2023-03-01', '2023-06-01');
var mon23 = getBest('2023-06-01', '2023-10-01');
var post23 = getBest('2023-10-01', '2024-01-01');


// ========================================
// MNDWI FUNCTION
// ========================================

function makeMNDWI(image) {

  return image
    .normalizedDifference(['B3', 'B11'])
    .rename('MNDWI')
    .clip(aoi);
}


// ========================================
// CREATE MNDWI IMAGES
// ========================================

var mndwiDry21 = makeMNDWI(dry21);
var mndwiPre21 = makeMNDWI(pre21);
var mndwiMon21 = makeMNDWI(mon21);
var mndwiPost21 = makeMNDWI(post21);

var mndwiDry22 = makeMNDWI(dry22);
var mndwiPre22 = makeMNDWI(pre22);
var mndwiMon22 = makeMNDWI(mon22);
var mndwiPost22 = makeMNDWI(post22);

var mndwiDry23 = makeMNDWI(dry23);
var mndwiPre23 = makeMNDWI(pre23);
var mndwiMon23 = makeMNDWI(mon23);
var mndwiPost23 = makeMNDWI(post23);


// ========================================
// PRINT SELECTED DATES
// ========================================

print('2021 Dry date:',
  ee.Date(dry21.get('system:time_start')).format('YYYY-MM-dd'));

print('2021 Pre-monsoon date:',
  ee.Date(pre21.get('system:time_start')).format('YYYY-MM-dd'));

print('2021 Monsoon date:',
  ee.Date(mon21.get('system:time_start')).format('YYYY-MM-dd'));

print('2021 Post-monsoon date:',
  ee.Date(post21.get('system:time_start')).format('YYYY-MM-dd'));


print('2022 Dry date:',
  ee.Date(dry22.get('system:time_start')).format('YYYY-MM-dd'));

print('2022 Pre-monsoon date:',
  ee.Date(pre22.get('system:time_start')).format('YYYY-MM-dd'));

print('2022 Monsoon date:',
  ee.Date(mon22.get('system:time_start')).format('YYYY-MM-dd'));

print('2022 Post-monsoon date:',
  ee.Date(post22.get('system:time_start')).format('YYYY-MM-dd'));


print('2023 Dry date:',
  ee.Date(dry23.get('system:time_start')).format('YYYY-MM-dd'));

print('2023 Pre-monsoon date:',
  ee.Date(pre23.get('system:time_start')).format('YYYY-MM-dd'));

print('2023 Monsoon date:',
  ee.Date(mon23.get('system:time_start')).format('YYYY-MM-dd'));

print('2023 Post-monsoon date:',
  ee.Date(post23.get('system:time_start')).format('YYYY-MM-dd'));


// ========================================
// DISPLAY ONE EXAMPLE
// ========================================

Map.addLayer(
  mndwiDry21,
  {
    min: -0.5,
    max: 0.8,
    palette: ['brown', 'yellow', 'white', 'cyan', 'blue']
  },
  'MNDWI Dry 2021'
);
// ========================================
// STEP 7 — EXPORT SEASONAL MNDWI
// PILOT: 2021–2023
// ========================================

// ----------------------------------------
// Function: Create MNDWI
// Green = B3
// SWIR = B11
// ----------------------------------------
function makeMNDWI(image) {
  return image
    .normalizedDifference(['B3', 'B11'])
    .rename('MNDWI')
    .clip(aoi);
}


// ========================================
// 2021
// ========================================

var mndwiDry21  = makeMNDWI(dry21);
var mndwiPre21  = makeMNDWI(pre21);
var mndwiMon21  = makeMNDWI(mon21);
var mndwiPost21 = makeMNDWI(post21);


// ========================================
// 2022
// ========================================

var mndwiDry22  = makeMNDWI(dry22);
var mndwiPre22  = makeMNDWI(pre22);
var mndwiMon22  = makeMNDWI(mon22);
var mndwiPost22 = makeMNDWI(post22);


// ========================================
// 2023
// ========================================

var mndwiDry23  = makeMNDWI(dry23);
var mndwiPre23  = makeMNDWI(pre23);
var mndwiMon23  = makeMNDWI(mon23);
var mndwiPost23 = makeMNDWI(post23);


// ========================================
// VISUAL CHECK
// ========================================

var mndwiVis = {
  min: -0.5,
  max: 0.8,
  palette: ['brown', 'yellow', 'white', 'cyan', 'blue']
};

Map.addLayer(mndwiDry21,  mndwiVis, 'MNDWI Dry 2021', false);
Map.addLayer(mndwiPre21,  mndwiVis, 'MNDWI Pre 2021', false);
Map.addLayer(mndwiMon21,  mndwiVis, 'MNDWI Monsoon 2021', false);
Map.addLayer(mndwiPost21, mndwiVis, 'MNDWI Post 2021', false);

Map.addLayer(mndwiDry22,  mndwiVis, 'MNDWI Dry 2022', false);
Map.addLayer(mndwiPre22,  mndwiVis, 'MNDWI Pre 2022', false);
Map.addLayer(mndwiMon22,  mndwiVis, 'MNDWI Monsoon 2022', false);
Map.addLayer(mndwiPost22, mndwiVis, 'MNDWI Post 2022', false);

Map.addLayer(mndwiDry23,  mndwiVis, 'MNDWI Dry 2023', false);
Map.addLayer(mndwiPre23,  mndwiVis, 'MNDWI Pre 2023', false);
Map.addLayer(mndwiMon23,  mndwiVis, 'MNDWI Monsoon 2023', false);
Map.addLayer(mndwiPost23, mndwiVis, 'MNDWI Post 2023', false);


// ========================================
// EXPORT — 12 MNDWI RASTERS
// ========================================

// 2021
Export.image.toDrive({
  image: mndwiDry21,
  description: 'Cox_MNDWI_Dry_2021',
  folder: 'Cox_Pilot_MNDWI',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: mndwiPre21,
  description: 'Cox_MNDWI_PreMonsoon_2021',
  folder: 'Cox_Pilot_MNDWI',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: mndwiMon21,
  description: 'Cox_MNDWI_Monsoon_2021',
  folder: 'Cox_Pilot_MNDWI',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: mndwiPost21,
  description: 'Cox_MNDWI_PostMonsoon_2021',
  folder: 'Cox_Pilot_MNDWI',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});


// 2022
Export.image.toDrive({
  image: mndwiDry22,
  description: 'Cox_MNDWI_Dry_2022',
  folder: 'Cox_Pilot_MNDWI',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: mndwiPre22,
  description: 'Cox_MNDWI_PreMonsoon_2022',
  folder: 'Cox_Pilot_MNDWI',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: mndwiMon22,
  description: 'Cox_MNDWI_Monsoon_2022',
  folder: 'Cox_Pilot_MNDWI',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: mndwiPost22,
  description: 'Cox_MNDWI_PostMonsoon_2022',
  folder: 'Cox_Pilot_MNDWI',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});


// 2023
Export.image.toDrive({
  image: mndwiDry23,
  description: 'Cox_MNDWI_Dry_2023',
  folder: 'Cox_Pilot_MNDWI',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: mndwiPre23,
  description: 'Cox_MNDWI_PreMonsoon_2023',
  folder: 'Cox_Pilot_MNDWI',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: mndwiMon23,
  description: 'Cox_MNDWI_Monsoon_2023',
  folder: 'Cox_Pilot_MNDWI',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: mndwiPost23,
  description: 'Cox_MNDWI_PostMonsoon_2023',
  folder: 'Cox_Pilot_MNDWI',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});

print('12 MNDWI export tasks created.');
