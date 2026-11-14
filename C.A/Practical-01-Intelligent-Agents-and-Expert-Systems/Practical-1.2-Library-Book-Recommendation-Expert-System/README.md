# Library Book Recommendation System

## Aim
To create a book recommendation system using Prolog facts and rules.

## Knowledge Base
[`library_system.pl`](library_system.pl) contains book details such as title, genre, pages, author, rating, and publication year.

## Features
The program includes the following predicates:

- `quick_read/1` – Finds books within the page limit.
- `well_rated/1` – Finds books rated 4 or above.
- `classic/1` – Finds books published before 2000.
- `recent/1` – Finds books published in 2000 or later.
- `masterpiece/1` – Finds five-star books.
- `british_author_book/1` – Finds books by British authors.
- `in_favourite_genre/1` – Finds books from favourite genres.
- `suggested/1` – Finds short and well-rated books.
- `top_pick/1` – Finds recommended books from favourite genres.
- `skippable/1` – Finds books rated below 4.
- `long_read/1` – Finds books exceeding the page limit.
- `genre_books/2` – Finds books by genre.
- `author_books/2` – Finds books by author.
- `genre_count/2` – Counts books in a genre.
- `show_book/1` – Displays book details.
- `show_suggestions/0` – Displays all suggested books.
- `show_top_picks/0` – Displays all top picks.

## How to Run

1. Open SWI-Prolog.
2. Load the file:

```prolog
?- consult('library_system.pl').
```

3. Run queries such as:

```prolog
?- show_suggestions.
?- show_top_picks.
?- show_book(atomic_habits).
?- genre_books(Book, fiction).
?- author_books(Book, orwell).
?- genre_count(tech, Count).
```

## Technologies Used
- Prolog
- SWI-Prolog

## Conclusion
This project uses Prolog facts and rules to find and recommend books based on genre, rating, page limit, author, and publication year.