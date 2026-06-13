# EEG Coding Test - Backend Scala

## The Problem

One part of a current project is responsible for processing the XML data received from a partner. In the attachment you can find a sample file containing some statistics from a football match. We would like you to write a program that:

* Can be executed with command line: java -cp ... xxx.jar. It should accept two parameters:
type of statistic to check
path to a file to process
* When executed, the program will read the XML from path 1b and will write to output top 5 players with statistic 1a (from any team; desc). Players should be written with format: `<POSITION_IN_RANKING>. <FIRST NAME> <LAST NAME> - <STATISTIC_VALUE>`
* Will also sum the value for that statistic for each team. Team should be written with format: `<TEAM_SIDE>; <TEAM_NAME> - <SUM_OF_STATISTIC_VALUES>`

Add a section to this README explaining:
* how to build the application - this should be a single command
* how to run the application - this should be a single command

**Notes:**

What we’re looking for:
* How you approach the problem (are you writing everything from scratch? If not, what libraries are you suing to support/accelerate your work).
* How you structure your code/files
* How you prioritise the sub-tasks involved (how much attention to pay to testing, what things do you automate?)
* Security

## Time limit

There’s no time limit, spend as much or as little time on this as you like. This isn’t a catch (seeing how much work you put in) it’s because we know everyone is busy and it can be difficult to make the time for this kind of thing. If you feel like you could/should have done more then provide us with some indication of what you would have done and how you would have done it (n README, pseudocode, comments, etc) 

