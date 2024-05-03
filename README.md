# Overview
Welcome to the main repository for the **OpenSimpleBank** project, a simple micro-economy software I started working on for personal reasons.

## Disclaimer
This project has been created **just for fun**, I highly expect there to be security issues littered throughout the project - this is just meant for small communities.
Please don't trust this with anything of value, and if you do, *you do so at your own risk*.

## Getting Started
The main thing you'll need to configure is the `.env` file which contains things such as database access information required by Prisma. I included an `.env.default` file which has a template layed out for configuring the application.

The first step, you need to spin up your database, namely, a Postgresql database (though this should be interchangable with other supported Prisma targets). 
Next, run `npm run build:prisma` then `npm run push:prisma` to have your database configured to run.
Now, run the application with `npm run start`. There you go!

## License
The license I choose is the GPL license, which you can view the information on [here](https://choosealicense.com/licenses/gpl-3.0/), but here's the gist.
- You can't make close-sourced copies.
That's pretty much it. Besides that, I'm not liable for anything that happens from using my code.

## Inspiration
When playing games like Minecraft, I personally like to have some sort of economy in place to do trading with the other players. Now, I could be satisfied with just using diamonds or such, but that has obvious problems in of itself, so creating some currency in world is a usual good idea. I personally like using signed books, since it tells you when it is a counterfit! However, there's obvious issues with this - clunky, expensive IU, and who's to say anyone will trust you as banker. Then you'll have dozens of banks, with their own bills, which you *can't even stack*, so you'll need an inventory full of signed books!
Having an actual currency makes all of this easier, but designing a whole system for the currency still wouldn't fix one problem - who says anyone will trust me? Even if we all used the same software, you'd have to be switching from page to page for transactions, and multi-currency trades could get annoying! Hence, the idea for **OSB** was made.