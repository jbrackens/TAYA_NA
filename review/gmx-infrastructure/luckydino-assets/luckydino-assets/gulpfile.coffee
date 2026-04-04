require('events').EventEmitter.defaultMaxListeners = 5000

gulp = require 'gulp'
rename = require 'gulp-rename'
spritesmith     = require 'gulp.spritesmith'
shell = require 'gulp-shell'
fs = require 'fs'

buildId = 'b'

base = '/Users/janne/Dropbox/Projects/gstech/brandserver-backend/src/stylus/luckydino/banners/'
spriteBase = '/Users/janne/Dropbox/LuckyDino/Live/g/'
sourceBase = '/Users/janne/Dropbox/LuckyDino/Banners/GoLive/'
tasks = []
files = {}
bgFiles = []

sprites = (g, name, cls) ->
  group = g.toLowerCase()
  tasks.push "#{group}_#{name}"
  imgName = "#{group}_#{name}_#{buildId}.png"
  cssName = "_#{group}_#{name}.styl"
  files[cssName] = {group, name, cls}

  gulp.task "#{group}_bg", [], ->
    fileName = "#{group}_bg_#{buildId}.jpg"
    bgFiles.push {name: "$#{group}_bg", fileName}
    gulp.src("#{sourceBase}#{g}/bg.jpg").pipe(rename(fileName)).pipe(gulp.dest(spriteBase))

  gulp.task "#{group}_bg_m", [], ->
    fileName = "#{group}_bg_m_#{buildId}.jpg"
    bgFiles.push {name: "$#{group}_bg_m", fileName}
    gulp.src("#{sourceBase}#{g}/bg_m.jpg").pipe(rename(fileName)).pipe(gulp.dest(spriteBase))


  gulp.task "#{group}_#{name}", ["#{group}_bg", "#{group}_bg_m"], ->
    spritedata = gulp.src("#{sourceBase}#{g}/#{name}/*.png")
      .pipe(spritesmith({
        imgName: imgName,
        cssName: cssName,
        algorithm: 'binary-tree'
        padding: 4
        cssVarMap: (sprite) ->
          sprite.name = "#{group}_#{name}_#{sprite.name}"
          sprite
      }))

    spritedata.img.pipe(gulp.dest("./build/"))
    spritedata.css.pipe(gulp.dest(base))

  # gulp.task "#{group}_#{name}_compress", ["#{group}_#{name}"], -> gulp.src("./build/#{imgName}").pipe(shell("/usr/local/bin/pngquant -f --speed 1 \"<%= file.path %>\" --output \"#{spriteBase}#{imgName}\""))

sprites('New1stDeposit', 'common')
sprites('New1stDeposit', 'en')
sprites('New1stDeposit', 'sv')
sprites('New1stDeposit', 'fi')
sprites('New1stDeposit', 'de')
sprites('New1stDeposit', 'no')
sprites('New1stDeposit', 'ja')
sprites('New1stDeposit', 'en_mobile')
sprites('New1stDeposit', 'fi_mobile')
sprites('New1stDeposit', 'sv_mobile')
sprites('New1stDeposit', 'de_mobile')
sprites('New1stDeposit', 'no_mobile')
sprites('New1stDeposit', 'ja_mobile')
sprites('New2ndDeposit', 'common')
sprites('New2ndDeposit', 'common_mobile')

sprites('Aliens', 'common')
sprites('GirlswithgunsII', 'common')
sprites('Lights', 'common')

sprites('NonLoggedin', 'common')
sprites('NonLoggedin', 'en_mobile')
sprites('NonLoggedin', 'fi_mobile')
sprites('NonLoggedin', 'sv_mobile')
sprites('NonLoggedin', 'de_mobile')
sprites('NonLoggedin', 'no_mobile')
sprites('NonLoggedin', 'ja_mobile')
sprites('NonLoggedin', 'en')
sprites('NonLoggedin', 'fi')
sprites('NonLoggedin', 'sv')
sprites('NonLoggedin', 'de')
sprites('NonLoggedin', 'no')
sprites('NonLoggedin', 'ja')


sprites('Wildwater', 'common')
sprites('Wildwater', 'commonmobile')
sprites('Wonkywabbits', 'common')
sprites('T2', 'common')
sprites('Wishmaster', 'common')
sprites('Castlebuilder', 'common')
sprites('Castlebuilder', 'common_mobile')
sprites('BigBang', 'common')
sprites('BigBang', 'common_mobile')
sprites('FootballStar', 'common')
sprites('GonzosQuest_new', 'common')
sprites('GonzosQuest_new', 'common_mobile')
sprites('Reelrush', 'common')
sprites('Reelrush', 'common_mobile')
sprites('Starburst_new', 'common')
sprites('Starburst_new', 'common_mobile')
sprites('TwinSpin', 'common')
sprites('TwinSpin', 'common_mobile')
sprites('LostIsland', 'common')
sprites('LostIsland', 'common_mobile')
sprites('Attraction', 'common')
sprites('Attraction', 'common_mobile')
sprites('Jurassicpark', 'common')
sprites('GoBananas', 'common')
sprites('GoBananas', 'common_mobile')
sprites('Creaturefromtheblacklagoon', 'common')
sprites('Creaturefromtheblacklagoon', 'common_mobile')
sprites('JackAndTheBeanstalk', 'common')
sprites('JackAndTheBeanstalk', 'common_mobile')
sprites('Playboy', 'common')
sprites('Playboy', 'common_mobile')
sprites('RedHotDevil', 'common')
sprites('RedHotDevil', 'common_mobile')
# sprites('Robyn', 'common')
# sprites('Robyn', 'common_mobile')
sprites('SouthParkReelChaos', 'common')
sprites('SouthParkReelChaos', 'fi')
sprites('SouthParkReelChaos', 'de')
sprites('SouthParkReelChaos', 'en')
sprites('SouthParkReelChaos', 'sv')
sprites('SouthParkReelChaos', 'no')
sprites('SouthParkReelChaos', 'common_mobile')

sprites('CosmicFortune', 'common')
sprites('CosmicFortune', 'common_mobile')

sprites('GameOfThrones', 'common')
sprites('GameOfThrones', 'common_mobile')

# sprites('Welcomeoffer29B', 'common')
# sprites('Welcomeoffer29B', 'en_mobile')
# sprites('Welcomeoffer29B', 'fi_mobile')
# sprites('Welcomeoffer29B', 'sv_mobile')
# sprites('Welcomeoffer29B', 'de_mobile')
# sprites('Welcomeoffer29B', 'en')
# sprites('Welcomeoffer29B', 'fi')
# sprites('Welcomeoffer29B', 'sv')
# sprites('Welcomeoffer29B', 'de')

sprites('ReferAFriend', 'common')
sprites('ReferAFriend', 'en_mobile')
sprites('ReferAFriend', 'fi_mobile')
sprites('ReferAFriend', 'sv_mobile')
sprites('ReferAFriend', 'de_mobile')
sprites('ReferAFriend', 'no_mobile')
sprites('ReferAFriend', 'en')
sprites('ReferAFriend', 'fi')
sprites('ReferAFriend', 'sv')
sprites('ReferAFriend', 'de')
sprites('ReferAFriend', 'no')

sprites('ExitPage2', 'desktop')
sprites('ExitPage2', 'mobile')

sprites('DragonsMyth', 'common')
sprites('DragonsMyth', 'common_mobile')
sprites('PiggyRiches', 'common')
sprites('PiggyRiches', 'common_mobile')
sprites('ImmortalRomance', 'common')
sprites('ImmortalRomance', 'common_mobile')
sprites('WildWater_new', 'common')
sprites('WildWater_new', 'common_mobile')
sprites('Evolution', 'common')
sprites('Evolution', 'common_mobile')
sprites('EggoMatic', 'common')
sprites('EggoMatic', 'common_mobile')
sprites('DoA', 'common')
sprites('DoA', 'common_mobile')
sprites('SecretStones', 'common')
sprites('SecretStones', 'common_mobile')

sprites('Dracula', 'common')
sprites('Dracula', 'common_mobile')
sprites('Stickers', 'common')
sprites('Stickers', 'common_mobile')
sprites('Tornado', 'common')
sprites('Tornado', 'common_mobile')
sprites('SpinataGrande', 'common')
sprites('SpinataGrande', 'common_mobile')
sprites('TheInvisibleMan', 'common')
sprites('TheInvisibleMan', 'common_mobile')
sprites('SteamTower', 'common')
sprites('SteamTower', 'common_mobile')
sprites('STAXX', 'common')
sprites('STAXX', 'common_mobile')
sprites('HooksHeroes', 'common')
# sprites('DazzleMe', 'common')
# sprites('DazzleMe', 'common_mobile')
sprites('Pyramid', 'common')
sprites('Pyramid', 'common_mobile')
sprites('KingOfSlots', 'common')
sprites('KingOfSlots', 'common_mobile')
sprites('KoiPrincess', 'common')
sprites('KoiPrincess', 'common_mobile')
sprites('Glow', 'common')
sprites('Glow', 'common_mobile')
sprites('Drive', 'common')
sprites('Drive', 'common_mobile')
sprites('Fantasini', 'common')
sprites('Fantasini', 'common_mobile')
sprites('GnR', 'common')
sprites('GnR', 'common_mobile')
sprites('Aloha', 'common')
sprites('Aloha', 'common_mobile')
sprites('Jimi', 'common')
sprites('Jimi', 'common_mobile')

sprites('AmazonQueen', 'common')
sprites('AmazonQueen', 'common_mobile')
sprites('BierHaus', 'common')
sprites('BierHaus', 'common_mobile')
sprites('BruceLee', 'common')
sprites('BruceLee', 'common_mobile')
sprites('RagingRhino', 'common')
sprites('RagingRhino', 'common_mobile')
sprites('RubySlippers', 'common')
sprites('RubySlippers', 'common_mobile')
sprites('Spartacus', 'common')
sprites('Spartacus', 'common_mobile')
sprites('Zeus1000', 'common')
sprites('Zeus1000', 'common_mobile')
sprites('ZeusIII', 'common')
sprites('ZeusIII', 'common_mobile')
sprites('Fcup', 'common')
sprites('Fcup', 'common_mobile')
sprites('NRVNA', 'common')
sprites('NRVNA', 'common_mobile')
sprites('PigsFly', 'common')
sprites('PigsFly', 'common_mobile')
sprites('SuperStarburst', 'common')
sprites('SuperStarburst', 'common_mobile')
sprites('SoA', 'common')
sprites('SoA', 'common_mobile')
sprites('Megafortune', 'common')
sprites('Megafortune', 'common_mobile')
sprites('Motorhead', 'common')
sprites('Motorhead', 'common_mobile')
sprites('RedRidingHood', 'common')
sprites('RedRidingHood', 'common_mobile')
sprites('Warlords', 'common')
sprites('Warlords', 'common_mobile')
sprites('WWW', 'common')
sprites('WWW', 'common_mobile')
sprites('JokerPRO', 'common')
sprites('JokerPRO', 'common_mobile')
sprites('DivineFortune', 'common')
sprites('DivineFortune', 'common_mobile')
sprites('JungleSpirit', 'common')
sprites('JungleSpirit', 'common_mobile')
sprites('HG', 'common')
sprites('HG', 'common_mobile')
sprites('Scruffy', 'common')
sprites('Scruffy', 'common_mobile')
sprites('Copycat', 'common')
sprites('Copycat', 'common_mobile')
sprites('Butterfly', 'common')
sprites('Butterfly', 'common_mobile')
sprites('Emoji', 'common')
sprites('Wolf', 'common')
sprites('Wolf', 'common_mobile')
sprites('Shangrila', 'common')
sprites('Shangrila', 'common_mobile')
sprites('Shangrila', 'common_medium')
sprites('BS2', 'common')
sprites('BS2', 'common_mobile')
sprites('POA', 'common')
sprites('Swirlyspin', 'common')
sprites('Swirlyspin', 'common_mobile')
sprites('TwinSpinDeluxe', 'common')
sprites('TwinSpinDeluxe', 'common_mobile')
sprites('PhantomsCurse', 'common')
sprites('Asgardian', 'common')
sprites('Goldking', 'common')
sprites('Goldking', 'common_mobile')
sprites('ImperialOpera', 'common')
sprites('ImperialOpera', 'common_mobile')
sprites('SweetAlchemy', 'common')
sprites('SweetAlchemy', 'common_mobile')
sprites('MonacoRush', 'common')
sprites('MonacoRush', 'common_mobile')
sprites('BakersTreat', 'common')
sprites('BakersTreat', 'common_mobile')
sprites('CopsnRobbers', 'common')
sprites('CopsnRobbers', 'common_mobile')
sprites('LostRelics', 'common')
sprites('LostRelics', 'common_mobile')
sprites('HugoGoal', 'common')
sprites('HugoGoal', 'common_mobile')
sprites('SizzlingSpins', 'common')
sprites('SizzlingSpins', 'common_mobile')
sprites('RiseOfOlympus', 'common')
sprites('RiseOfOlympus', 'common_mobile')
sprites('StreetMagic', 'common')
sprites('StreetMagic', 'common_mobile')
sprites('IronGirl', 'common')
sprites('IronGirl', 'common_mobile')
sprites('Gunslingersre', 'common')
sprites('Gunslingersre', 'common_mobile')
sprites('Bananarock', 'common')
sprites('Bananarock', 'common_mobile')
sprites('RagingRex', 'common')
sprites('RagingRex', 'common_mobile')

sprites('CashVandal_spinosaurus', 'common')

sprites('2xRewards', 'common')
sprites('2xRewards', 'common_mobile')

# for c in ['SuperWeekend_eggomatic', 'SuperWeekend_jabs', 'SuperWeekend_aloha']
#   sprites(c, 'common')
#   for lang in ['en', 'de', 'fi', 'no', 'sv']
#     sprites(c, "#{lang}_mobile")
#     sprites(c, lang)

gulp.task 'combine', ->
  result = for file, props of files
    "@require '#{file}'"
  for item in bgFiles
    result.push "#{item.name} = '/g/#{item.fileName}'"
  fs.writeFileSync(base + '_banner_sprites.styl', result.join('\n'))

tasks.push 'combine'
gulp.task('default', tasks)

