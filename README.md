# 🤖 Natours - backend

Exciting tours for adventurous people. Natours is an application for users to book tours.

This repo is just the backend of the whole application. There is a separate repo for the frontend that you can check out [here](https://github.com/codert0109/natours).

## 📱 Screenshots

![Natours](https://user-images.githubusercontent.com/94133102/209841542-20c1a989-bf13-455c-a3e7-ddd8ef1f6539.png)

![Natours](https://user-images.githubusercontent.com/94133102/209841741-a7beb45a-45e8-452e-bcec-10959a3a9ddd.png)

## 🧑🏼‍💻 Tech Stack
- Node JS
- Express JS
- MongoDB (mongoose library to manage DB)
- `ndb` as the debugger

The project follows a MVC pattern. The models go inside the `./models` folder, controllers inside `./controllers` and other utils inside the `./utils`

## ⚙️ Installation

To run Natours on your local machine run the following commands

- Clone your foked repository
   ```sh
    git clone https://github.com/codert0109/natours-backend.git
   ```
- Navigate to root directory and run
   ```sh
   npm install
   ```
- Rename `config.copy.env` to `config.env` and fill all your environment details

- To start the server
   ```sh
   npm run start:dev
   ```

## 🛂 Contributing

Contributions are always welcomed! Before contributing, please keep in mind the following:

- Make sure the application has no errors and is working perfectly fine
- Make sure the code is well formatted and should follow the formatting rules mentioned in `.prettierrc` file and linting mentioned in `.eslintrc.json` file

## 🗺️ Roadmap

- Add google signin/signup
- Implement refresh tokens
- Add tours stats

## 🪲 Found a bug?

If you find any bugs in the projects not listed in the issues panel. Then feel free to create an issue regarding the bug.

## 🤖 Feedback

If you have any feedback, please reach out to me at thebluemoonsea@gmail.com


## 📝 License

[MIT](https://choosealicense.com/licenses/mit/)

