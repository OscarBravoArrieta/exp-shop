import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import type { Category } from '../models/category.model';

export interface CreateCategoryInput {
    name: string;
    image: string;
    slug: string;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
    id: string;
}

const CATEGORY_FIELDS = `
  id
  name
  image
  slug
  isActive
  createdAt
  updatedAt
`;

const CATEGORIES_QUERY = gql`
  query Categories {
    categories { ${CATEGORY_FIELDS} }
  }
`;

const CATEGORY_BY_ID_QUERY = gql`
  query Category($id: ID!) {
    category(id: $id) { ${CATEGORY_FIELDS} }
  }
`;

const CREATE_CATEGORY_MUTATION = gql`
  mutation CreateCategory($createCategoryInput: CreateCategoryInput!) {
    createCategory(createCategoryInput: $createCategoryInput) { ${CATEGORY_FIELDS} }
  }
`;

const UPDATE_CATEGORY_MUTATION = gql`
  mutation UpdateCategory($updateCategoryInput: UpdateCategoryInput!) {
    updateCategory(updateCategoryInput: $updateCategoryInput) { ${CATEGORY_FIELDS} }
  }
`;

const SOFT_DELETE_CATEGORY_MUTATION = gql`
  mutation SoftDeleteCategory($id: ID!) {
    softDeleteCategory(id: $id) { ${CATEGORY_FIELDS} }
  }
`;

/**
 * `categories`/`category` son públicas del lado del backend (catálogo sin
 * login); crear/editar/eliminar exige rol admin — ver CategoriesResolver.
 */
@Injectable({ providedIn: 'root' })
export class Categories {
    private readonly apollo = inject(Apollo);

    getCategories(): Observable<Category[]> {
        return this.apollo
            .query<{ categories: Category[] }>({
                query: CATEGORIES_QUERY,
                fetchPolicy: 'network-only',
            })
            .pipe(map(result => result.data?.categories ?? []));
    }

    getCategoryById(id: string): Observable<Category> {
        return this.apollo
            .query<{ category: Category }>({
                query: CATEGORY_BY_ID_QUERY,
                variables: { id },
                fetchPolicy: 'network-only',
            })
            .pipe(
                map(result => {
                    if (!result.data) {
                        throw new Error(`No se encontró la categoría ${id}`);
                    }
                    return result.data.category;
                })
            );
    }

    createCategory(createCategoryInput: CreateCategoryInput): Observable<Category> {
        return this.apollo
            .mutate<{ createCategory: Category }>({
                mutation: CREATE_CATEGORY_MUTATION,
                variables: { createCategoryInput },
            })
            .pipe(
                map(result => {
                    if (!result.data) {
                        throw new Error('No se pudo crear la categoría');
                    }
                    return result.data.createCategory;
                })
            );
    }

    updateCategory(updateCategoryInput: UpdateCategoryInput): Observable<Category> {
        return this.apollo
            .mutate<{ updateCategory: Category }>({
                mutation: UPDATE_CATEGORY_MUTATION,
                variables: { updateCategoryInput },
            })
            .pipe(
                map(result => {
                    if (!result.data) {
                        throw new Error('No se pudo actualizar la categoría');
                    }
                    return result.data.updateCategory;
                })
            );
    }

    /** Baja lógica: el backend marca isActive en false, no borra el registro. */
    softDeleteCategory(id: string): Observable<Category> {
        return this.apollo
            .mutate<{ softDeleteCategory: Category }>({
                mutation: SOFT_DELETE_CATEGORY_MUTATION,
                variables: { id },
            })
            .pipe(
                map(result => {
                    if (!result.data) {
                        throw new Error('No se pudo desactivar la categoría');
                    }
                    return result.data.softDeleteCategory;
                })
            );
    }
}
