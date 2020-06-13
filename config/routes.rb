Rails.application.routes.draw do
  get 'date/:year/:month/:day', to: 'days#show', as: :date
  get 'date/:year/:month', to: 'days#index', as: :month
  get 'date/:year', to: 'days#index', as: :year

  resources :days, only: [:show, :edit, :update, :destroy, :new, :create]
  get 'home/show'
  root to: 'home#show'

  resources :notes do
    collection do
      get :search
    end
  end
end
