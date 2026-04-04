# **Rollup**

Rollup is a way to bundle all our JS that appears on all pages into a single file, run it through an error checker, and compile it into javascript that runs in all browsers.
We use this for all code that appears everywhere, with builds for SbTech and BetConstruct (each have their own repo)

There are some scripts that run only on some pages, or behind the SbTech 'Include/Exclude' tags, which are separate still, though where possible, they are being added here. There is also the angular elements blocks.

## List of scripts

Each script is seperated into folders with a rough category they belong to to make them easier to find.

### Angular Blocks

These scripts add our angular blocks to the page dynamically. Most are just set as HTML in the cms, but some need to be added to the page when certain events run.

#### Specials block
The angular 'specials' block shows on horse racing and soccer pages. It shows any 'enhanced odds'  that have their titles set in a specific way, to show what sport/league they are for. The backend then filters all specials. We can then send the current sport id and league id, get the specials that are currently active, and display them using our Specials Widget (which is an angular widget itself.
This code just gets the current sports/league on each age, and sets the league/sport id of the angular element.

### Betslip
Any scripts that effect the betslip

#### Move betslip Errors
The betslip errors are inserted at the top of the betslip by sbtech. This can push the betslip further down the page, or with a long betslip, will make them not visible while trying to submit your betslip, since the errors might be off screen.
This script watches the betslip for errors, and if one is added, it moves it to the bottom of the betslip. There are a few exception, as some errors apear under the 'line' that the error is for, so those are not moved.

### Casino
#### Late Night Casino
When a user plays on casino late at night (between 2 and 8 am) we monitor how long they have played for. After 1 hour of play, the backend adds a tag to the user account. This script watches for this tag, and if found, creates a popup to say it's getting late and ask if they want to keep playing. if they click play, then nothing happens, popup closes. If they say stop playing, it will kick them back to home page, block casino until 8am, and adds a note the user account with when they clicked it.
Uses: https://api.rewardsmatrix.com/pc/casino_2am_consent
AgTagManager
AgNoteManage

#### Move Cas Bundle
In versions 4.6, SbTech started moving all inline css to the 'head' section of the page, for some unknown reason. This meant that our custom casino css was applying and THEN then css from their casino-bundle was applying. This script just moves the casino bundle above the custom css, so that the cas-bundle applies first.

### General
Miscellaneous scripts

#### SbTech Helpers
##### Add To Betslip
A script that lets you use a javascript object with the details of a bet, and add it directly to the betslip. This is a simplified version of some SbTech functions, that we can use in our own code to add things to the betslip. It is a helper function for our Angular code, but can be used outside of angular if needed.
##### Check last Login
When the 'react' last login block was created, it was only added to top level pages, so clicking this link on anuy second level page (i.e. promotion pages) made before version 4.2 meant that the link wouldnt work. This script detects if the block is present on the page, and hides the link if it is not (which is better than a broken link existing)
##### Hide Doc Upload
We only want users who are not verified to be able to upload docs through the site. All other requests for docs go to emails instead. This script checks a users verification status on login/navigation, and hides the document upload blocks for users who shouldnt see it.
Hide unless one of the followingis true:

- unverified
- equifax red
- 1k, 1.5k, or 1.7k tags AND not ID verified

#####  Login Panel Fix
Similar to the above, in some version, SbTech  changed the links to the login panel. This script checks if the new panel is not present on the page, and if it's not, it sets the login function to open the old login panel.
##### Open Help Links
On mobile, the account links open as pages, but on desktop, they open as modals. Instead of needing 2 links for mobile and desktop, this is a function that lets you set the modal id and link, detects what type of devise the user is on, and then opens the correct view.
##### Open Reality Checks
Code to let us open the reality check without needing a link


#### Analytics helpers
Any scripts that we need in order to track analytics should go here. Currently, most can be run from tag manager. The only function here is a script that detects if a user opens the RG panel/page, and then adds a click listener for when a user times themselves out.

#### Cookie Policy
A function that creates a small popup in the bottom corner to let people know about our cookie policy. If a user presses accept, it stores a cookie and wont show again on that device for a year, or until cookies are cleared.

#### Toggles
Adds click listeners to our accordians i.e. on the help pages. You can click the title to show the body content, like in our FAQ's.

### Marketing
#### Float Banner / Sports Banners
This gets the list of active mobile floating banners from Directus. If the banner has date or page set, it will show the banner before the end date, on any pages it's set to show.
Uses https://volga.prod.gmx.flipsports.net/_/items/sn_mobile_floating_banner
Sports banners is the same, but for a different location.

### Navigation
#### Bog Racing
Users can purchase BOG racing from the reward store. Once they do, they get a #BOG tag. This script replaces the first item on the mobile navigation with a BOG link.

#### Outrights
This lets you add ?outright to the end of any url. If you do, it checks for an outright tab, and simulates a click on it. This means we can link directly to the outrights tab (a feature still not offered by SbTech)

#### Racing Types
The greyhound and horse racing panels are treated as the same by sbtech, however, we only want the custom racing panel to show for Horse Racing. This script checks what sport is open, and adds it as a data element to the panel. The panel itself in angular can use this to show the right view, or we can apply css to the panel based on what sport this is.

### Responsible Gaming
#### Documents modal
When users hit certain 'check points' of deposits or account activity, the backend adds tags to their account. This script detects these tags, and if the user has one, it show a modal asking them to submit docs.
If  user on the popup clicks 'no', they can a _SEEN tag for that check point and wont see it again. If the user clicks YES they get a Jira ticket made with their User ID, a seen tag, and a note on their account.
The 17k trigger will show on every login, instead of using a _SEEN tag.
Uses: AgTagManager
agNoteManager
https://api.rewardsmatrix.com/pc/atm/add_jira

#### Redirect On Tag
If a user has certain tags, we block them from using tjhe site, and send them to different pages. This script takes a list of tags and the page to send them to. most tags are added automaticalyl by the backend, though some can be added manually. For example the #bulkrisk tag will send the user to /help/account-notice

#### Review modal
When users hit certain 'check points' of deposits or account activity, the backend adds tags to their account. This script detects these tags, and if the user has one, it show a modal asking if they want to keep playing or see our RG pages. Similar to documents modal.
If  user on the popup clicks 'no', they can a _SEEN tag for that check point and wont see it again. If the user clicks YES they get a Jira ticket made with their User ID, a seen tag, and a note on their account.
Uses: AgTagManager
agNoteManager
https://api.rewardsmatrix.com/pc/atm/add_jira

#### Verification
When a user opens the verification panel or page (also opened automatically when creating a new account), this script will check the users verification status (include ire and f account status). it then adds data-elements to the panel for what their status is. There is then css that will hide or show certain messages to the user (either saying their account is good, or they need to send docs, etc)

#### Withdarawl modals
At some point, we stopped allowing users to cancel their withdrawals. This script adds a function to the withdrawal buttons so that instaed of opening the withdrawal page, it opens a popup explaining that once they press withdrawal they can't reverse it. Clicking continue will open the withdrawal page as normal.

### Tools
Tools we have written to be used by the various other scripts (and angular elements)

#### AgNoteManager
A function that takes a string, and adds it as a note to the users account.
Uses: https://api.rewardsmatrix.com/pc/atm/add_note

#### AgTagManager
A function that takes a tag or array of tags, and adds it as a note to the users account. These tags must first be 'whitelisted' by adding them to the backend as available tags.
Uses: https://api.rewardsmatrix.com/pc/atm/add_tag
https://api.rewardsmatrix.com/virtual_shop/tags_whitelist/

#### Create modal
The function that creates modals used in other functions. Needs a title, text, text for both buttons and either links or functions for both buttons.

#### User details
Queries the SbTech API for the users personal details and decodes them, or the users tags. Used in all functions that check tags, and functions that need user details that arent stored in the UserDetails.currenty object.

#### utils
small functions used by other rollupscripts

#### agHttpRequestT
A function that sends a http request to our apis. Makes it easier to write requestions instead of writing the whole function each time.

#### General
Small function to stop us re-writing them. One for checking if a date is today. One for parsing JWT tokens.

#### Generate SbToken
Generates an SbTech token. Either a single use token, or one the refreshes every 30 seconds. Again, just a simple function so we only have to write getToken() instead of the whole function each time.

#### Global token
As above, but no longer used. Still in code as some old widgets use it.

#### SN only
Scripts just used on sn. Currently its just a function to return the brand details.

### Vip
#### Check Vip
Checks a users tags, and if they have any VIP tag, adds vip as a class to body (which can then be used by other scripts or css)

#### Hide VIP Markets
Some markets are meant for only VIP users, but SbTech don't offer this as a feature. If a user *doesnt* have a vip tag, we find any links to that market, and any blocks for those markets, and remove them from the page. This is not perfect as direct links to the bet or market will still work, but it stops them showing up normally, which stops 99% of non-vip's from using them (a  VIP would have to link a non-vip to the market directly)
