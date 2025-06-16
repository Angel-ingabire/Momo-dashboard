#Momo Dashboard.
#This is a momo Dashboard website that allows a user to search downloard and view transactions sorted in credit or debit, and even types like incoming transactions, Bank transfers, bill payments and more......

Before we proceed, here is the link to our REPORT documentation: https://docs.google.com/document/d/1BpDY5XZuoLBOatGJhqOkX6Zk6NcFlVHuShQRpDsbIyA/edit?usp=sharing

#Front-end functionality and features.

# We used plain html and css to develop and style the front-end and some java-script for responsivenes
The  Front-end conprises of three ways the user can filter transactions i.e through types by drop-down, manual search like a name 
and also search by inputing amount and it will then display data on the page according to the user's request.
# The overview page also comprises of data displayed inform of types names amount and the details aswell, since the tyransactions were alot, we included pages so that the user canbe able to still go through all the transactions without any problem
the overview page, also has summary cards summarizing the total number of transactions inform of total transactions, incoming, deposits, and payments.
# The charts page is used for visualisation of the transactions and it basically displays a summary of the transactions and displays that info in form of graphs and a pie chart aswell.
# The reports page allows a user to chooose which transactions they would like to download, by date and then they have an option of either downloading the transactions in pdf or csv
# The settings page allows the user to change to dark mode if thwy like to view in dark mode.

#data extraction
# We were able to create a file that extracts data from the xml file cleans and sorts the data and prints the cleaned data, and we created a separate file for all the unprosessed sms.

#database design
# We created a my sql database to store the cleaned data and then connected it to the extraction file with the db parameters so that now the data can be loaded into the db 
# created a summary file that calculates summary of transactions and loads them into the db aswell

#API and front-end responsiveness

# We developed and API that will basically load the data into the front-end so that the user can interact with it on the user interface.
# How to interact and run our code 

We have created a public  repo on github and collaborated on it you can clone it, at https://github.com/Angel-ingabire/Momo-dashboard there you have access to both the front-end and the back-end with all functionalities and once you run the code you are able to see all these features working.
Momo-dashboard/
│
├── frontend/                 # HTML, CSS, JavaScript files
│   ├── index.html
│   ├── charts.html
│   ├── reports.html
│   └── ...
│
├── backend/
│   ├── main.py          # XML data cleaning and extraction
│   ├── summary.py            # Calculates transaction summaries
│   ├── api.py                # Flask/Express REST API
│   └── db_config.py    # DB connection settings
│
├── data/
│   ├── modified_sms_v2.xml
│   ├── momo_database.sql
│   └── unprocessed_sms.log
│
└── README.md


# Video to our final project 
This a link to the project video that shows a demo of interactions as if we were a user interacting with the site and it covers both the functionality and the understanding of our work.
This video shows all of what we just talked about live and working, the readme what is left is a link to the video included
