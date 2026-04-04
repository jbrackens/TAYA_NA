Use rollup -c to build.
This will compile are CSS and JS for all 3 brands.

In the CMS, user Admin Blocks / Admin - Rollup in each brand for testing, and a StuDev account.
If you need to test logged out views, make a new temporary block with your IP address as an Inlcude, and Exclude on PROD.

Once tested, update PROD in Argyll Blocks / agScripts - rollup

This should currently be used for any scripts that can be on all pages, for all users.
Any scripts that have include/exclude tags should be built individually and added to the relevant blocks.
However, scripts can always use the globalDetails.tags function to get user tags before running.
